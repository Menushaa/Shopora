using System.Security.Cryptography;
using System.Text;

namespace Shopora.Api.Services;

public record LoginResult(UserDto User, string Token, DateTime ExpiresAt);

public class AuthService(ShoporaDbContext db, TokenService tokens, IConfiguration config,
    IHostEnvironment env, DevTokenStore devTokens, ILogger<AuthService> log)
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromMinutes(30);
    // Used so unknown emails take as long as real ones (prevents account discovery by timing).
    private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword("not-a-real-password-1!", 11);

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
    private static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    private static ApiException InvalidCredentials() => new(401, "INVALID_CREDENTIALS", "Invalid email or password.");

    public async Task<UserDto> RegisterAsync(RegisterRequest r)
    {
        var email = NormalizeEmail(r.Email);
        if (await db.Users.AnyAsync(u => u.Email == email))
            throw ApiException.Conflict("EMAIL_EXISTS", "An account with this email already exists.");

        var role = await db.Roles.SingleAsync(x => x.Name == Roles.Customer);
        var user = new User
        {
            FullName = r.FullName.Trim(),
            Address = r.Address.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.Password, 11),
            Cart = new Cart(),
            Wishlist = new Wishlist(),
        };
        user.UserRoles.Add(new UserRole { User = user, Role = role });
        db.Users.Add(user);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException) // two simultaneous registrations with the same email
        {
            throw ApiException.Conflict("EMAIL_EXISTS", "An account with this email already exists.");
        }
        return user.ToDto();
    }

    public async Task<LoginResult> LoginAsync(LoginRequest r)
    {
        var email = NormalizeEmail(r.Email);
        var user = await db.Users.Include(u => u.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(u => u.Email == email);

        if (user == null)
        {
            BCrypt.Net.BCrypt.Verify(r.Password, DummyHash);
            throw InvalidCredentials();
        }

        if (user.LockoutEnd > DateTime.UtcNow)
            throw new ApiException(429, "ACCOUNT_LOCKED", "Too many failed attempts. Please try again in 15 minutes.");

        if (!BCrypt.Net.BCrypt.Verify(r.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= MaxFailedAttempts)
            {
                user.LockoutEnd = DateTime.UtcNow.Add(LockoutDuration);
                user.FailedLoginCount = 0;
                log.LogWarning("Account locked after repeated failed logins: {Email}", email);
            }
            await db.SaveChangesAsync();
            throw InvalidCredentials();
        }

        if (!user.IsActive)
            throw new ApiException(403, "ACCOUNT_DISABLED", "This account has been deactivated. Please contact support.");

        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        await db.SaveChangesAsync();

        var (token, expires) = tokens.Create(user, user.UserRoles.First().Role.Name, r.RememberMe);
        return new LoginResult(user.ToDto(), token, expires);
    }

    public async Task<UserDto> GetUserAsync(int userId)
    {
        var user = await db.Users.AsNoTracking().Include(u => u.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(u => u.Id == userId) ?? throw ApiException.Unauthorized();
        return user.ToDto();
    }

    /// <summary>Always succeeds from the caller's point of view, so it cannot be used to discover accounts.</summary>
    public async Task ForgotPasswordAsync(ForgotPasswordRequest r)
    {
        var email = NormalizeEmail(r.Email);
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email && u.IsActive);
        if (user == null) return;

        var now = DateTime.UtcNow;
        var old = await db.PasswordResetTokens.Where(t => t.UserId == user.Id && t.UsedAt == null).ToListAsync();
        foreach (var t in old) t.UsedAt = now; // only the newest token works

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id, TokenHash = HashToken(token), ExpiresAt = now.Add(ResetTokenLifetime)
        });
        await db.SaveChangesAsync();

        // No real email is sent. In Development/Test the token is written to the log and (Test) a dev endpoint.
        if (!env.IsProduction())
            log.LogInformation("[SIMULATED EMAIL] Password reset token for {Email}: {Token} (valid 30 minutes)", email, token);
        if (config.GetValue<bool>("Features:TestEndpoints")) devTokens.Set(email, token);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest r)
    {
        var hash = HashToken(r.Token.Trim());
        var token = await db.PasswordResetTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (token == null || token.UsedAt != null || token.ExpiresAt < DateTime.UtcNow)
            throw ApiException.BadRequest("INVALID_RESET_TOKEN", "This reset link is invalid or has expired.");

        token.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.NewPassword, 11);
        token.User.FailedLoginCount = 0;
        token.User.LockoutEnd = null;
        token.User.UpdatedAt = DateTime.UtcNow;
        token.UsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
}
