namespace Shopora.Api.Controllers;

/// <summary>Base class: JSON in/out, standard response envelope helpers and documented error responses.</summary>
[ApiController]
[Produces("application/json")]
[ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status409Conflict)]
[ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]
public abstract class ApiControllerBase : ControllerBase
{
    protected ActionResult<ApiResponse<T>> Success<T>(T data) => base.Ok(ApiResponse<T>.Ok(data));

    protected ActionResult<ApiResponse<T>> CreatedOk<T>(T data) =>
        StatusCode(StatusCodes.Status201Created, ApiResponse<T>.Ok(data));
}

/// <summary>Marks a controller as requiring a signed-in user (adds 401/403 to the Swagger docs).</summary>
[ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
public abstract class SecuredControllerBase : ApiControllerBase { }
