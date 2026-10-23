using Microsoft.AspNetCore.Mvc.Filters;

namespace Shopora.Api.Middleware;

/// <summary>Hides an endpoint (404) unless Features:TestEndpoints is true (Test environment only).</summary>
public class TestOnlyAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        var cfg = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        if (!cfg.GetValue<bool>("Features:TestEndpoints"))
            context.Result = new NotFoundResult();
    }
}
