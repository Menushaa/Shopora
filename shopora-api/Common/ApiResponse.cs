namespace Shopora.Api.Common;

/// <summary>Error details returned when <c>success</c> is false.</summary>
public class ApiError
{
    public string Code { get; set; } = "";
    public string Message { get; set; } = "";
    /// <summary>Per-field validation messages, keyed by camelCase field name.</summary>
    public Dictionary<string, string[]>? Fields { get; set; }
}

/// <summary>Every API response uses this envelope: { success, data, error }.</summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public ApiError? Error { get; set; }
    public static ApiResponse<T> Ok(T data) => new() { Success = true, Data = data };
}

public static class ApiResponse
{
    public static ApiResponse<object> Fail(string code, string message, Dictionary<string, string[]>? fields = null) =>
        new() { Success = false, Error = new ApiError { Code = code, Message = message, Fields = fields } };
}

public static class Policies
{
    public const string AdminOnly = "AdminOnly";
    public const string CustomerOnly = "CustomerOnly";
}
