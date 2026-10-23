namespace Shopora.Api.Controllers.Admin;

/// <summary>Admin: manage products (including inactive ones).</summary>
[Route("api/v1/admin/products"), Authorize(Policy = Policies.AdminOnly)]
public class AdminProductsController(AdminService admin) : SecuredControllerBase
{
    [HttpGet] public async Task<ActionResult<ApiResponse<PagedResult<ProductDto>>>> List([FromQuery] AdminProductQuery query) =>
        Success(await admin.ListProductsAsync(query));

    [HttpGet("{id:int}")] public async Task<ActionResult<ApiResponse<ProductDto>>> Get(int id) => Success(await admin.GetProductAsync(id));

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ProductDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Create(ProductRequest request) => CreatedOk(await admin.CreateProductAsync(request));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Update(int id, ProductRequest request) => Success(await admin.UpdateProductAsync(id, request));

    /// <summary>Activate or deactivate (soft delete) a product. Inactive products are hidden and cannot be bought.</summary>
    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> SetStatus(int id, StatusRequest request) =>
        Success(await admin.SetProductStatusAsync(id, request.IsActive!.Value));

    /// <summary>Set the stock quantity (0 or more).</summary>
    [HttpPatch("{id:int}/stock")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> SetStock(int id, StockRequest request) =>
        Success(await admin.SetStockAsync(id, request.Stock!.Value));

    /// <summary>Deactivates the product (same as PATCH status with isActive=false). Products are never physically deleted.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Deactivate(int id)
    {
        await admin.SetProductStatusAsync(id, false);
        return NoContent();
    }
}

/// <summary>Admin: manage categories.</summary>
[Route("api/v1/admin/categories"), Authorize(Policy = Policies.AdminOnly)]
public class AdminCategoriesController(AdminService admin) : SecuredControllerBase
{
    [HttpGet] public async Task<ActionResult<ApiResponse<List<CategoryDto>>>> List() => Success(await admin.ListCategoriesAsync());

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<CategoryDto>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Create(CategoryRequest request) => CreatedOk(await admin.CreateCategoryAsync(request));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Update(int id, CategoryRequest request) => Success(await admin.UpdateCategoryAsync(id, request));

    /// <summary>Deactivating hides all products of the category and blocks buying them; reactivating restores them.</summary>
    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> SetStatus(int id, StatusRequest request) =>
        Success(await admin.SetCategoryStatusAsync(id, request.IsActive!.Value));
}

/// <summary>Admin: view and (de)activate customer accounts. Password data is never exposed.</summary>
[Route("api/v1/admin/users"), Authorize(Policy = Policies.AdminOnly)]
public class AdminUsersController(AdminService admin) : SecuredControllerBase
{
    [HttpGet] public async Task<ActionResult<ApiResponse<PagedResult<AdminUserDto>>>> List([FromQuery] AdminUserQuery query) =>
        Success(await admin.ListUsersAsync(query));

    [HttpGet("{id:int}")] public async Task<ActionResult<ApiResponse<AdminUserDto>>> Get(int id) => Success(await admin.GetUserAsync(id));

    /// <summary>Deactivated customers cannot log in and any open session stops working immediately.</summary>
    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> SetStatus(int id, StatusRequest request) =>
        Success(await admin.SetUserStatusAsync(id, request.IsActive!.Value));
}

/// <summary>Admin: view all orders and move them through the status workflow.</summary>
[Route("api/v1/admin/orders"), Authorize(Policy = Policies.AdminOnly)]
public class AdminOrdersController(OrderService orders) : SecuredControllerBase
{
    [HttpGet] public async Task<ActionResult<ApiResponse<PagedResult<OrderDto>>>> List([FromQuery] AdminOrderQuery query) =>
        Success(await orders.AdminListAsync(query));

    [HttpGet("{id:int}")] public async Task<ActionResult<ApiResponse<OrderDto>>> Get(int id) => Success(await orders.AdminGetAsync(id));

    /// <summary>
    /// Allowed: Pending to Confirmed or Cancelled, Confirmed to Processing or Cancelled, Processing to Shipped, Shipped to Delivered.
    /// Anything else returns 409 INVALID_STATUS_TRANSITION. Cancelling restocks items; Delivered settles cash-on-delivery payments.
    /// </summary>
    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> UpdateStatus(int id, OrderStatusRequest request) =>
        Success(await orders.AdminUpdateStatusAsync(id, request.Status!.Value));
}

/// <summary>Admin: dashboard numbers and reports.</summary>
[Route("api/v1/admin"), Authorize(Policy = Policies.AdminOnly)]
public class AdminReportsController(ReportService reports) : SecuredControllerBase
{
    [HttpGet("dashboard/summary")]
    public async Task<ActionResult<ApiResponse<DashboardSummaryDto>>> Summary() => Success(await reports.DashboardAsync());

    /// <summary>Low-stock (1-5 units) and out-of-stock active products.</summary>
    [HttpGet("reports/inventory")]
    public async Task<ActionResult<ApiResponse<InventoryReportDto>>> Inventory() => Success(await reports.InventoryAsync());

    /// <summary>Sales from Delivered orders, per day, with top products. Defaults to the last 30 days.</summary>
    [HttpGet("reports/sales")]
    public async Task<ActionResult<ApiResponse<SalesReportDto>>> Sales([FromQuery] SalesQuery query) => Success(await reports.SalesAsync(query));
}
