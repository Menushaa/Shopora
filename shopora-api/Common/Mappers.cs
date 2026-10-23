namespace Shopora.Api.Common;

public static class Mappers
{
    public static UserDto ToDto(this User u) =>
        new(u.Id, u.FullName, u.Address, u.Email,
            u.UserRoles.Select(r => r.Role.Name).FirstOrDefault() ?? Roles.Customer, u.IsActive);

    public static AddressDto ToDto(this Address a) =>
        new(a.Id, a.Label, a.FullName, a.Line1, a.Line2, a.City, a.PostalCode, a.Phone, a.IsDefault);

    public static bool IsPurchasable(this Product p) => p.IsActive && (p.Category?.IsActive ?? true) && p.Stock > 0;

    public static ProductDto ToDto(this Product p) =>
        new(p.Id, p.Sku, p.Name, p.Description, p.Price, p.DiscountPercent, p.FinalPrice, p.CategoryId,
            p.Category?.Name ?? "", p.ImageUrl, p.Stock, p.IsActive, p.Stock > 0, p.IsFeatured, p.CreatedAt, p.UpdatedAt);

    public static CartDto ToDto(this Cart c)
    {
        var lines = c.Items.OrderBy(i => i.AddedAt).ThenBy(i => i.Id).Select(i =>
        {
            var p = i.Product;
            return new CartItemDto(i.Id, p.Id, p.Name, p.ImageUrl, p.Price, p.DiscountPercent, p.FinalPrice,
                i.Quantity, p.FinalPrice * i.Quantity, p.Stock, p.IsPurchasable() && i.Quantity <= p.Stock);
        }).ToList();
        var subtotal = c.Items.Sum(i => i.Product.Price * i.Quantity);
        var total = lines.Sum(l => l.LineTotal);
        return new CartDto(lines, subtotal, subtotal - total, total, lines.Sum(l => l.Quantity));
    }

    public static WishlistItemDto ToDto(this WishlistItem w) => new(w.Id, w.Product.ToDto(), w.Product.IsPurchasable(), w.AddedAt);

    public static OrderDto ToDto(this Order o) =>
        new(o.Id, o.OrderNumber, o.Status, o.Payment?.Status ?? PaymentStatus.Pending, o.Payment?.Method,
            o.Payment?.TransactionRef, o.Subtotal, o.DiscountTotal, o.Total, o.CreatedAt, o.UpdatedAt,
            new ShippingAddressDto(o.ShipFullName, o.ShipLine1, o.ShipLine2, o.ShipCity, o.ShipPostalCode, o.ShipPhone),
            o.Items.OrderBy(i => i.Id).Select(i => new OrderItemDto(i.Id, i.ProductId, i.ProductName, i.Sku, i.UnitPrice,
                i.DiscountPercent, i.Quantity == 0 ? 0 : Math.Round(i.LineTotal / i.Quantity, 2), i.Quantity, i.LineTotal)).ToList(),
            o.IsCancellable, o.User?.FullName ?? "", o.User?.Email ?? "");
}
