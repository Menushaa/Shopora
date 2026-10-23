using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Shopora.Api.Services;

public record JwtSettings(string Key, string Issuer, string Audience);

public class TokenService(JwtSettings settings)
{
    public (string Token, DateTime Expires) Create(User user, string role, bool rememberMe)
    {
        var expires = DateTime.UtcNow.Add(rememberMe ? TimeSpan.FromDays(30) : TimeSpan.FromHours(2));
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = settings.Issuer,
            Audience = settings.Audience,
            Expires = expires,
            Claims = new Dictionary<string, object>
            {
                ["uid"] = user.Id.ToString(),
                ["role"] = role,
                ["name"] = user.FullName,
                ["email"] = user.Email,
                ["jti"] = Guid.NewGuid().ToString("N"),
            },
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Key)), SecurityAlgorithms.HmacSha256),
        };
        return (new JsonWebTokenHandler().CreateToken(descriptor), expires);
    }
}

/// <summary>Remembers logged-out tokens (by jti) until they would have expired anyway.</summary>
public class TokenRevocationStore
{
    private readonly ConcurrentDictionary<string, DateTime> _revoked = new();

    public void Revoke(string jti, DateTime expiresUtc)
    {
        foreach (var kv in _revoked.Where(k => k.Value < DateTime.UtcNow).ToList()) _revoked.TryRemove(kv.Key, out _);
        _revoked[jti] = expiresUtc;
    }

    public bool IsRevoked(string? jti) => jti != null && _revoked.ContainsKey(jti);
}

/// <summary>Test/Dev helper: remembers the latest raw password-reset token per email (never used in production).</summary>
public class DevTokenStore
{
    private readonly ConcurrentDictionary<string, string> _tokens = new();
    public void Set(string email, string token) => _tokens[email] = token;
    public string? Get(string email) => _tokens.TryGetValue(email.Trim().ToLowerInvariant(), out var t) ? t : null;
}

public interface ICurrentUser
{
    int UserId { get; }
    bool IsAdmin { get; }
    string? Jti { get; }
    DateTime? TokenExpiry { get; }
}

public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal Principal => accessor.HttpContext?.User ?? throw ApiException.Unauthorized();
    public int UserId => int.TryParse(Principal.FindFirstValue("uid"), out var id) ? id : throw ApiException.Unauthorized();
    public bool IsAdmin => Principal.IsInRole(Roles.Admin);
    public string? Jti => Principal.FindFirstValue("jti");
    public DateTime? TokenExpiry => long.TryParse(Principal.FindFirstValue("exp"), out var e)
        ? DateTimeOffset.FromUnixTimeSeconds(e).UtcDateTime : null;
}
