namespace Shopora.Api.Common;

/// <summary>Thrown anywhere in the API to produce a clean, consistent error response.</summary>
public class ApiException(int status, string code, string message, Dictionary<string, string[]>? fields = null)
    : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
    public Dictionary<string, string[]>? Fields { get; } = fields;

    public static ApiException NotFound(string message, string code = "NOT_FOUND") => new(404, code, message);
    public static ApiException Conflict(string code, string message) => new(409, code, message);
    public static ApiException BadRequest(string code, string message, Dictionary<string, string[]>? fields = null) => new(400, code, message, fields);
    public static ApiException Unauthorized(string message = "Authentication is required.") => new(401, "UNAUTHORIZED", message);
    public static ApiException Validation(string field, string message) =>
        new(400, "VALIDATION_ERROR", "One or more fields are invalid.",
            new Dictionary<string, string[]> { [field] = new[] { message } });
}
