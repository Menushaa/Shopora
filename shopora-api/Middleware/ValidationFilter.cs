using FluentValidation;

namespace Shopora.Api.Middleware;

/// <summary>
/// Runs binding checks and FluentValidation validators for every action argument.
/// Produces: 400 { success:false, error:{ code:"VALIDATION_ERROR", fields:{ email:["..."] } } }.
/// Runs after authorization, so unauthenticated callers get 401/403 first.
/// </summary>
public class ValidationFilter(IServiceProvider services) : Microsoft.AspNetCore.Mvc.Filters.IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(Microsoft.AspNetCore.Mvc.Filters.ActionExecutingContext ctx,
        Microsoft.AspNetCore.Mvc.Filters.ActionExecutionDelegate next)
    {
        var fields = new Dictionary<string, List<string>>();

        if (!ctx.ModelState.IsValid)
        {
            foreach (var (key, entry) in ctx.ModelState)
                foreach (var _ in entry.Errors)
                    Add(fields, key, string.IsNullOrEmpty(key) ? "A valid request body is required." : "Invalid value.");
        }
        else
        {
            foreach (var arg in ctx.ActionArguments.Values)
            {
                if (arg is null) continue;
                var type = typeof(IValidator<>).MakeGenericType(arg.GetType());
                if (services.GetService(type) is not IValidator validator) continue;
                var result = await validator.ValidateAsync(new ValidationContext<object>(arg));
                foreach (var e in result.Errors) Add(fields, e.PropertyName, e.ErrorMessage);
            }
        }

        if (fields.Count > 0)
            throw ApiException.BadRequest("VALIDATION_ERROR", "One or more fields are invalid.",
                fields.ToDictionary(k => k.Key, v => v.Value.Distinct().ToArray()));

        await next();
    }

    private static void Add(Dictionary<string, List<string>> fields, string key, string message)
    {
        var name = string.Join('.', key.Replace("$.", "").Split('.', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Length == 0 ? s : char.ToLowerInvariant(s[0]) + s[1..]));
        if (name.Length == 0) name = "request";
        if (!fields.TryGetValue(name, out var list)) fields[name] = list = new();
        list.Add(message);
    }
}
