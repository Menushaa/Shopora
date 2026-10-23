namespace Shopora.Api.Services;

public class CartService(ShoporaDbContext db)
{
    private async Task<Cart> LoadAsync(int userId)
    {
        var cart = await db.Carts.Include(c => c.Items).ThenInclude(i => i.Product).ThenInclude(p => p.Category)
            .SingleOrDefaultAsync(c => c.UserId == userId);
        if (cart == null)
        {
            cart = new Cart { UserId = userId };
            db.Carts.Add(cart);
            await db.SaveChangesAsync();
        }
        return cart;
    }

    /// <summary>Rejects inactive, deactivated-category and out-of-stock products.</summary>
    public static void EnsurePurchasable(Product p)
    {
        if (!p.IsActive || !p.Category.IsActive)
            throw ApiException.Conflict("PRODUCT_UNAVAILABLE", $"'{p.Name}' is no longer available.");
        if (p.Stock <= 0)
            throw ApiException.Conflict("OUT_OF_STOCK", $"'{p.Name}' is out of stock.");
    }

    private static ApiException NotEnoughStock(Product p) =>
        ApiException.Conflict("INSUFFICIENT_STOCK", $"Only {p.Stock} unit(s) of '{p.Name}' are available.");

    public async Task<CartDto> GetAsync(int userId) => (await LoadAsync(userId)).ToDto();

    public async Task<CartDto> AddAsync(int userId, AddCartItemRequest r)
    {
        var product = await db.Products.Include(p => p.Category).FirstOrDefaultAsync(p => p.Id == r.ProductId!.Value)
            ?? throw ApiException.NotFound("Product not found.");
        EnsurePurchasable(product);

        var cart = await LoadAsync(userId);
        var existing = cart.Items.FirstOrDefault(i => i.ProductId == product.Id);
        var newQuantity = (long)(existing?.Quantity ?? 0) + r.Quantity!.Value;
        if (newQuantity > product.Stock) throw NotEnoughStock(product);

        if (existing != null) existing.Quantity = (int)newQuantity;   // same product: merge, never duplicate
        else cart.Items.Add(new CartItem { ProductId = product.Id, Product = product, Quantity = (int)newQuantity });
        cart.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return cart.ToDto();
    }

    public async Task<CartDto> UpdateAsync(int userId, int itemId, UpdateCartItemRequest r)
    {
        var cart = await LoadAsync(userId);
        var item = cart.Items.FirstOrDefault(i => i.Id == itemId) ?? throw ApiException.NotFound("Cart item not found.");
        EnsurePurchasable(item.Product);
        if (r.Quantity!.Value > item.Product.Stock) throw NotEnoughStock(item.Product);
        item.Quantity = r.Quantity.Value;
        cart.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return cart.ToDto();
    }

    public async Task<CartDto> RemoveAsync(int userId, int itemId)
    {
        var cart = await LoadAsync(userId);
        var item = cart.Items.FirstOrDefault(i => i.Id == itemId) ?? throw ApiException.NotFound("Cart item not found.");
        db.CartItems.Remove(item);
        cart.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return cart.ToDto();
    }

    public async Task<CartDto> ClearAsync(int userId)
    {
        var cart = await LoadAsync(userId);
        db.CartItems.RemoveRange(cart.Items);
        cart.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return cart.ToDto();
    }
}
