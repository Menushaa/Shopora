namespace Shopora.Api.Controllers;

/// <summary>The signed-in user's profile, password and delivery addresses. Always scoped to the caller.</summary>
[Route("api/v1/me")]
[Authorize]
public class MeController(ProfileService profile, AuthService auth, ICurrentUser me) : SecuredControllerBase
{
    /// <summary>Get my profile.</summary>
    [HttpGet] public async Task<ActionResult<ApiResponse<UserDto>>> Get() => Success(await auth.GetUserAsync(me.UserId));

    /// <summary>Update my name and address (the email cannot be changed).</summary>
    [HttpPut] public async Task<ActionResult<ApiResponse<UserDto>>> Update(UpdateProfileRequest request) =>
        Success(await profile.UpdateAsync(me.UserId, request));

    /// <summary>Change my password (requires the current password).</summary>
    [HttpPut("password")]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> ChangePassword(ChangePasswordRequest request)
    {
        await profile.ChangePasswordAsync(me.UserId, request);
        return Success(new MessageResponse("Your password has been changed."));
    }

    /// <summary>Customer dashboard data: order counts, recent orders, wishlist and featured products.</summary>
    [HttpGet("dashboard"), Authorize(Policy = Policies.CustomerOnly)]
    public async Task<ActionResult<ApiResponse<CustomerDashboardDto>>> Dashboard() => Success(await profile.DashboardAsync(me.UserId));

    /// <summary>List my addresses (default first).</summary>
    [HttpGet("addresses"), Authorize(Policy = Policies.CustomerOnly)]
    public async Task<ActionResult<ApiResponse<List<AddressDto>>>> Addresses() => Success(await profile.ListAddressesAsync(me.UserId));

    /// <summary>Add an address (maximum 10). The first address becomes the default.</summary>
    [HttpPost("addresses"), Authorize(Policy = Policies.CustomerOnly)]
    [ProducesResponseType(typeof(ApiResponse<AddressDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<AddressDto>>> AddAddress(AddressRequest request) =>
        CreatedOk(await profile.AddAddressAsync(me.UserId, request));

    /// <summary>Edit one of my addresses.</summary>
    [HttpPut("addresses/{id:int}"), Authorize(Policy = Policies.CustomerOnly)]
    public async Task<ActionResult<ApiResponse<AddressDto>>> UpdateAddress(int id, AddressRequest request) =>
        Success(await profile.UpdateAddressAsync(me.UserId, id, request));

    /// <summary>Make an address my default.</summary>
    [HttpPatch("addresses/{id:int}/default"), Authorize(Policy = Policies.CustomerOnly)]
    public async Task<ActionResult<ApiResponse<AddressDto>>> SetDefault(int id) => Success(await profile.SetDefaultAsync(me.UserId, id));

    /// <summary>Delete an address. The default address can only be deleted when it is the only one.</summary>
    [HttpDelete("addresses/{id:int}"), Authorize(Policy = Policies.CustomerOnly)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAddress(int id)
    {
        await profile.DeleteAddressAsync(me.UserId, id);
        return NoContent();
    }
}
