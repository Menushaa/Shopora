namespace Shopora.Api.Middleware;

/// <summary>Turns exceptions into the standard error envelope. Unknown errors become a generic 500.</summary>
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> log)
{
    public async Task Invoke(HttpContext ctx)
    {
        try { await next(ctx); }
        catch (ApiException ex)
        {
            await Write(ctx, ex.Status, ApiResponse.Fail(ex.Code, ex.Message, ex.Fields));
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Unhandled exception. TraceId={TraceId}", ctx.TraceIdentifier);
            await Write(ctx, 500, ApiResponse.Fail("SERVER_ERROR",
                $"An unexpected error occurred. Reference: {ctx.TraceIdentifier}"));
        }
    }

    private static Task Write(HttpContext ctx, int status, object body)
    {
        if (ctx.Response.HasStarted) return Task.CompletedTask;
        ctx.Response.StatusCode = status;
        return ctx.Response.WriteAsJsonAsync(body);
    }
}
