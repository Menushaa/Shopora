namespace Shopora.Api.Dtos;

// ---------- Auth & profile ----------
public record RegisterRequest(string FullName = "", string Address = "", string Email = "", string Password = "", string ConfirmPassword = "");
public record LoginRequest(string Email = "", string Password = "", bool RememberMe = false);
public record ForgotPasswordRequest(string Email = "");
public record ResetPasswordRequest(string Token = "", string NewPassword = "", string ConfirmPassword = "");
public record ChangePasswordRequest(string CurrentPassword = "", string NewPassword = "", string ConfirmPassword = "");
public record UpdateProfileRequest(string FullName = "", string Address = "");
public record UserDto(int Id, string FullName, string Address, string Email, string Role, bool IsActive);
/// <summary>The JWT itself is set as an HttpOnly cookie. <c>Token</c> is only returned when Auth:ReturnTokenInBody is enabled (Dev/Test).</summary>
public record LoginResponse(UserDto User, DateTime ExpiresAt, string? Token);
public record MessageResponse(string Message);

public record AddressRequest(string Label = "Home", string FullName = "", string Line1 = "", string? Line2 = null,
    string City = "", string PostalCode = "", string Phone = "", bool IsDefault = false);
public record AddressDto(int Id, string Label, string FullName, string Line1, string? Line2, string City,
    string PostalCode, string Phone, bool IsDefault);

public record ContactRequest(string Name = "", string Email = "", string Message = "");

// ---------- Catalogue ----------
public record CategoryDto(int Id, string Name, string? Description, bool IsActive, int ProductCount);
public record ProductDto(int Id, string Sku, string Name, string? Description, decimal Price, decimal DiscountPercent,
    decimal FinalPrice, int CategoryId, string CategoryName, string? ImageUrl, int Stock, bool IsActive, bool InStock,
    bool IsFeatured, DateTime CreatedAt, DateTime UpdatedAt);

public class ProductQuery
{
    /// <summary>Matches name, description or SKU.</summary>
    public string? Search { get; set; }
    public int? CategoryId { get; set; }
    /// <summary>Compared with the price after discount.</summary>
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    /// <summary>newest | name_asc | name_desc | price_asc | price_desc</summary>
    public string Sort { get; set; } = "newest";
    public int Page { get; set; } = 1;
    /// <summary>1 to 50.</summary>
    public int PageSize { get; set; } = 12;
}

public class AdminProductQuery : ProductQuery
{
    /// <summary>all | active | inactive</summary>
    public string Status { get; set; } = "all";
    /// <summary>all | low (1-5 units) | out (0 units)</summary>
    public string Stock { get; set; } = "all";
}

public class PageQuery
{
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    /// <summary>1 to 100.</summary>
    public int PageSize { get; set; } = 20;
}
public class AdminUserQuery : PageQuery { public bool? IsActive { get; set; } }
public class AdminOrderQuery : PageQuery
{
    public OrderStatus? Status { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}
public class SalesQuery { public DateTime? From { get; set; } public DateTime? To { get; set; } }

// ---------- Cart & wishlist ----------
public record AddCartItemRequest(int? ProductId = null, int? Quantity = null);
public record UpdateCartItemRequest(int? Quantity = null);
public record CartItemDto(int Id, int ProductId, string Name, string? ImageUrl, decimal UnitPrice, decimal DiscountPercent,
    decimal FinalPrice, int Quantity, decimal LineTotal, int Stock, bool IsAvailable);
public record CartDto(List<CartItemDto> Items, decimal Subtotal, decimal DiscountTotal, decimal Total, int ItemCount);

public record AddWishlistItemRequest(int? ProductId = null);
public record WishlistItemDto(int Id, ProductDto Product, bool IsAvailable, DateTime AddedAt);

// ---------- Orders ----------
public record CardInfo(string CardNumber = "", string HolderName = "", int? ExpiryMonth = null, int? ExpiryYear = null, string Cvv = "");
/// <summary>Use either <c>addressId</c> (a saved address) or <c>newAddress</c>. Prices are never accepted from the client.</summary>
public record CheckoutRequest(int? AddressId = null, AddressRequest? NewAddress = null,
    PaymentMethod PaymentMethod = PaymentMethod.Card, CardInfo? Card = null, string? IdempotencyKey = null);
public record OrderStatusRequest(OrderStatus? Status = null);

public record ShippingAddressDto(string FullName, string Line1, string? Line2, string City, string PostalCode, string Phone);
public record OrderItemDto(int Id, int ProductId, string ProductName, string Sku, decimal UnitPrice, decimal DiscountPercent,
    decimal FinalUnitPrice, int Quantity, decimal LineTotal);
public record OrderDto(int Id, string OrderNumber, OrderStatus Status, PaymentStatus PaymentStatus, PaymentMethod? PaymentMethod,
    string? PaymentReference, decimal Subtotal, decimal DiscountTotal, decimal Total, DateTime CreatedAt, DateTime UpdatedAt,
    ShippingAddressDto ShippingAddress, List<OrderItemDto> Items, bool CanCancel, string CustomerName, string CustomerEmail);
public record CheckoutResult(OrderDto Order, bool Created);
public record CustomerDashboardDto(string FullName, int TotalOrders, int PendingOrders, decimal TotalSpent, int WishlistCount,
    int CartItemCount, List<OrderDto> RecentOrders, List<ProductDto> Featured);

// ---------- Admin ----------
public record ProductRequest(string Name = "", string? Description = null, string? Sku = null, decimal? Price = null,
    decimal? DiscountPercent = 0, int? CategoryId = null, string? ImageUrl = null, int? Stock = null,
    bool IsActive = true, bool IsFeatured = false);
public record CategoryRequest(string Name = "", string? Description = null, bool IsActive = true);
public record StatusRequest(bool? IsActive = null);
public record StockRequest(int? Stock = null);

public record AdminUserDto(int Id, string FullName, string Email, string Address, bool IsActive, DateTime CreatedAt,
    int OrderCount, decimal TotalSpent, List<OrderDto>? RecentOrders);

public record DashboardSummaryDto(int TotalProducts, int ActiveProducts, int LowStockProducts, int OutOfStockProducts,
    int TotalCustomers, int TotalOrders, int PendingOrders, int CompletedOrders, decimal TotalSales, List<OrderDto> RecentOrders);
public record InventoryReportDto(int LowStockThreshold, int TotalProducts, List<ProductDto> LowStock, List<ProductDto> OutOfStock);
public record DailySalesDto(DateOnly Date, int Orders, decimal Sales);
public record TopProductDto(string ProductName, string Sku, int UnitsSold, decimal Revenue);
public record SalesReportDto(DateTime From, DateTime To, decimal TotalSales, int OrderCount, int ItemsSold,
    List<DailySalesDto> Daily, List<TopProductDto> TopProducts);
