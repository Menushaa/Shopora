using Microsoft.AspNetCore.RateLimiting;

namespace Shopora.Api.Controllers;

/// <summary>Registration, login (HttpOnly cookie), logout and password reset.</summary>
[Route("api/v1/auth")]
public class AuthController(AuthService auth, TokenRevocationStore revoked, ICurrentUser me, IConfiguration config)
    : ApiControllerBase
{
    public const string CookieName = "shopora_auth";

    private CookieOptions CookieOpts(DateTime? expires = null) => new()
    {
        HttpOnly = true, Secure = Request.IsHttps, SameSite = SameSiteMode.Lax, Path = "/", IsEssential = true, Expires = expires,
    };

    /// <summary>Create a customer account.</summary>
    [HttpPost("register"), AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<UserDto>>> Register(RegisterRequest request) =>
        CreatedOk(await auth.RegisterAsync(request));

    /// <summary>Sign in. On success the JWT is stored in an HttpOnly cookie; use the returned role to pick the dashboard.</summary>
    /// <remarks>5 failed attempts lock the account for 15 minutes (429). Wrong email and wrong password give the same 401 message.</remarks>
    [HttpPost("login"), AllowAnonymous, EnableRateLimiting("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(LoginRequest request)
    {
        var result = await auth.LoginAsync(request);
        // "Remember me" = persistent cookie (30 days). Otherwise a session cookie that also expires after 2 hours.
        Response.Cookies.Append(CookieName, result.Token, CookieOpts(request.RememberMe ? result.ExpiresAt : null));
        var token = config.GetValue<bool>("Auth:ReturnTokenInBody") ? result.Token : null;
        return Success(new LoginResponse(result.User, result.ExpiresAt, token));
    }

    /// <summary>Sign out: the token is revoked server-side and the cookie is cleared.</summary>
    [HttpPost("logout"), Authorize]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public ActionResult<ApiResponse<MessageResponse>> Logout()
    {
        if (me.Jti != null) revoked.Revoke(me.Jti, me.TokenExpiry ?? DateTime.UtcNow.AddDays(31));
        Response.Cookies.Delete(CookieName, CookieOpts());
        return Success(new MessageResponse("You have been logged out."));
    }

    /// <summary>The currently signed-in user.</summary>
    [HttpGet("me"), Authorize]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<UserDto>>> Me() => Success(await auth.GetUserAsync(me.UserId));

    /// <summary>Request a password-reset link. Always answers the same way, whether or not the email exists.</summary>
    [HttpPost("forgot-password"), AllowAnonymous]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> ForgotPassword(ForgotPasswordRequest request)
    {
        await auth.ForgotPasswordAsync(request);
        return Success(new MessageResponse("If an account exists for that email, a password reset link has been sent."));
    }

    /// <summary>Set a new password using a single-use token (valid 30 minutes).</summary>
    [HttpPost("reset-password"), AllowAnonymous]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> ResetPassword(ResetPasswordRequest request)
    {
        await auth.ResetPasswordAsync(request);
        return Success(new MessageResponse("Your password has been reset. You can now log in."));
    }
}
