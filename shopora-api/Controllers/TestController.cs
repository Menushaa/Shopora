using Shopora.Api.Middleware;

namespace Shopora.Api.Controllers;

/// <summary>Test helpers. These endpoints exist ONLY when Features:TestEndpoints is true (Test environment).</summary>
[Route("api/v1/test"), AllowAnonymous, TestOnly]
public class TestController(ShoporaDbContext db, DevTokenStore devTokens) : ApiControllerBase
{
    /// <summary>Wipe all data and restore the known seed data set (IDs restart at 1).</summary>
    [HttpPost("reset")]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> Reset()
    {
        await DbSeeder.ResetAsync(db);
        return Success(new MessageResponse("Database reset to the known seed state."));
    }

    /// <summary>Seed the known data set if the database has no users (no-op otherwise).</summary>
    [HttpPost("seed")]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> Seed()
    {
        await DbSeeder.SeedAsync(db);
        return Success(new MessageResponse("Seed data is in place."));
    }

    /// <summary>The latest password-reset token issued for an email (stands in for the email inbox).</summary>
    [HttpGet("reset-token")]
    public ActionResult<ApiResponse<MessageResponse>> ResetToken([FromQuery] string email) =>
        devTokens.Get(email) is { } token
            ? Success(new MessageResponse(token))
            : throw ApiException.NotFound("No reset token has been issued for that email.");
}
