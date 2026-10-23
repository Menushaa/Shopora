namespace Shopora.Api.Controllers;

/// <summary>My shopping cart (customers only). Prices and totals are always calculated by the server.</summary>
[Route("api/v1/cart"), Authorize(Policy = Policies.CustomerOnly)]
public class CartController(CartService cart, ICurrentUser me) : SecuredControllerBase
{
    [HttpGet] public async Task<ActionResult<ApiResponse<CartDto>>> Get() => Success(await cart.GetAsync(me.UserId));

    /// <summary>Add a product. Adding the same product again increases the quantity instead of creating a duplicate line.</summary>
    [HttpPost("items")]
    [ProducesResponseType(typeof(ApiResponse<CartDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<CartDto>>> Add(AddCartItemRequest request) =>
        CreatedOk(await cart.AddAsync(me.UserId, request));

    /// <summary>Set the quantity of a cart line (1 up to available stock).</summary>
    [HttpPut("items/{id:int}")]
    public async Task<ActionResult<ApiResponse<CartDto>>> Update(int id, UpdateCartItemRequest request) =>
        Success(await cart.UpdateAsync(me.UserId, id, request));

    /// <summary>Remove one line. Returns the updated cart.</summary>
    [HttpDelete("items/{id:int}")]
    public async Task<ActionResult<ApiResponse<CartDto>>> Remove(int id) => Success(await cart.RemoveAsync(me.UserId, id));

    /// <summary>Remove all lines. Returns the empty cart.</summary>
    [HttpDelete] public async Task<ActionResult<ApiResponse<CartDto>>> Clear() => Success(await cart.ClearAsync(me.UserId));
}

/// <summary>My wishlist (customers only).</summary>
[Route("api/v1/wishlist"), Authorize(Policy = Policies.CustomerOnly)]
public class WishlistController(WishlistService wishlist, ICurrentUser me) : SecuredControllerBase
{
    [HttpGet] public async Task<ActionResult<ApiResponse<List<WishlistItemDto>>>> List() => Success(await wishlist.ListAsync(me.UserId));

    [HttpPost("items")]
    [ProducesResponseType(typeof(ApiResponse<WishlistItemDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<WishlistItemDto>>> Add(AddWishlistItemRequest request) =>
        CreatedOk(await wishlist.AddAsync(me.UserId, request));

    [HttpDelete("items/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remove(int id)
    {
        await wishlist.RemoveAsync(me.UserId, id);
        return NoContent();
    }

    /// <summary>Move an available product to the cart (quantity 1) and remove it from the wishlist.</summary>
    [HttpPost("items/{id:int}/move-to-cart")]
    public async Task<ActionResult<ApiResponse<CartDto>>> MoveToCart(int id) => Success(await wishlist.MoveToCartAsync(me.UserId, id));
}

/// <summary>Checkout and my orders (customers only).</summary>
[Route("api/v1/orders"), Authorize(Policy = Policies.CustomerOnly)]
public class OrdersController(OrderService orders, ICurrentUser me) : SecuredControllerBase
{
    /// <summary>Place an order from my cart (simulated payment).</summary>
    /// <remarks>
    /// Test cards: <c>4111111111111111</c> approved, <c>4000000000000002</c> declined (402),
    /// <c>4000000000000069</c> gateway timeout (504). Send the same <c>idempotencyKey</c> to make retries safe:
    /// a repeat returns the original order with 200 instead of creating a second one.
    /// A failed payment creates no order and leaves stock and cart unchanged.
    /// </remarks>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<OrderDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status402PaymentRequired)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status504GatewayTimeout)]
    public async Task<ActionResult<ApiResponse<OrderDto>>> Checkout(CheckoutRequest request)
    {
        var result = await orders.CheckoutAsync(me.UserId, request);
        return result.Created ? CreatedOk(result.Order) : Success(result.Order);
    }

    /// <summary>My orders, newest first.</summary>
    [HttpGet] public async Task<ActionResult<ApiResponse<PagedResult<OrderDto>>>> List([FromQuery] PageQuery query) =>
        Success(await orders.MyOrdersAsync(me.UserId, query));

    /// <summary>One of my orders (404 if it belongs to someone else).</summary>
    [HttpGet("{id:int}")] public async Task<ActionResult<ApiResponse<OrderDto>>> Get(int id) => Success(await orders.GetMineAsync(me.UserId, id));

    /// <summary>Cancel my order. Allowed only while Pending or Confirmed; items are returned to stock.</summary>
    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> Cancel(int id) => Success(await orders.CancelAsync(me.UserId, id));
}
