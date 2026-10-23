namespace Shopora.Api.Services;

public class WishlistService(ShoporaDbContext db, CartService cart)
{
    private async Task<Wishlist> LoadAsync(int userId)
    {
        var list = await db.Wishlists.Include(w => w.Items).ThenInclude(i => i.Product).ThenInclude(p => p.Category)
            .SingleOrDefaultAsync(w => w.UserId == userId);
        if (list == null)
        {
            list = new Wishlist { UserId = userId };
            db.Wishlists.Add(list);
            await db.SaveChangesAsync();
        }
        return list;
    }

    public async Task<List<WishlistItemDto>> ListAsync(int userId) =>
        (await LoadAsync(userId)).Items.OrderByDescending(i => i.AddedAt).ThenByDescending(i => i.Id)
            .Select(i => i.ToDto()).ToList();

    public async Task<WishlistItemDto> AddAsync(int userId, AddWishlistItemRequest r)
    {
        var product = await db.Products.Include(p => p.Category).FirstOrDefaultAsync(p => p.Id == r.ProductId!.Value)
            ?? throw ApiException.NotFound("Product not found.");
        if (!product.IsActive || !product.Category.IsActive)
            throw ApiException.Conflict("PRODUCT_UNAVAILABLE", $"'{product.Name}' is no longer available.");

        var list = await LoadAsync(userId);
        if (list.Items.Any(i => i.ProductId == product.Id))
            throw ApiException.Conflict("ALREADY_IN_WISHLIST", "This product is already in your wishlist.");

        var item = new WishlistItem { WishlistId = list.Id, ProductId = product.Id, Product = product };
        list.Items.Add(item);
        await db.SaveChangesAsync();
        return item.ToDto();
    }

    public async Task RemoveAsync(int userId, int itemId)
    {
        var list = await LoadAsync(userId);
        var item = list.Items.FirstOrDefault(i => i.Id == itemId) ?? throw ApiException.NotFound("Wishlist item not found.");
        db.WishlistItems.Remove(item);
        await db.SaveChangesAsync();
    }

    public async Task<CartDto> MoveToCartAsync(int userId, int itemId)
    {
        var list = await LoadAsync(userId);
        var item = list.Items.FirstOrDefault(i => i.Id == itemId) ?? throw ApiException.NotFound("Wishlist item not found.");
        var result = await cart.AddAsync(userId, new AddCartItemRequest(item.ProductId, 1)); // throws if unavailable
        db.WishlistItems.Remove(item);
        await db.SaveChangesAsync();
        return result;
    }
}
