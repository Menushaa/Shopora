using System.Security.Cryptography;

namespace Shopora.Api.Services;

public class AdminService(ShoporaDbContext db)
{
    public const int LowStockThreshold = 5;

    // ---------------- products ----------------
    public async Task<PagedResult<ProductDto>> ListProductsAsync(AdminProductQuery f)
    {
        var q = db.Products.AsNoTracking().Include(p => p.Category).AsQueryable();
        if (f.Status == "active") q = q.Where(p => p.IsActive);
        else if (f.Status == "inactive") q = q.Where(p => !p.IsActive);
        if (f.Stock == "out") q = q.Where(p => p.Stock == 0);
        else if (f.Stock == "low") q = q.Where(p => p.Stock > 0 && p.Stock <= LowStockThreshold);
        return (await Paging.PageAsync(CatalogService.ApplyFilters(q, f), f.Page, f.PageSize)).Map(p => p.ToDto());
    }

    public async Task<ProductDto> GetProductAsync(int id) =>
        (await db.Products.AsNoTracking().Include(p => p.Category).FirstOrDefaultAsync(p => p.Id == id)
         ?? throw ApiException.NotFound("Product not found.")).ToDto();

    public async Task<ProductDto> CreateProductAsync(ProductRequest r)
    {
        await EnsureActiveCategoryAsync(r.CategoryId!.Value);
        var sku = string.IsNullOrWhiteSpace(r.Sku) ? "PRD-" + Convert.ToHexString(RandomNumberGenerator.GetBytes(3)) : r.Sku.Trim().ToUpperInvariant();
        if (await db.Products.AnyAsync(p => p.Sku == sku))
            throw ApiException.Conflict("DUPLICATE_SKU", $"SKU '{sku}' is already used by another product.");

        var product = new Product { Sku = sku };
        Apply(product, r);
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return await GetProductAsync(product.Id);
    }

    public async Task<ProductDto> UpdateProductAsync(int id, ProductRequest r)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id) ?? throw ApiException.NotFound("Product not found.");
        await EnsureActiveCategoryAsync(r.CategoryId!.Value);
        if (!string.IsNullOrWhiteSpace(r.Sku))
        {
            var sku = r.Sku.Trim().ToUpperInvariant();
            if (await db.Products.AnyAsync(p => p.Sku == sku && p.Id != id))
                throw ApiException.Conflict("DUPLICATE_SKU", $"SKU '{sku}' is already used by another product.");
            product.Sku = sku;
        }
        Apply(product, r);
        await db.SaveChangesAsync();
        return await GetProductAsync(id);
    }

    public async Task<ProductDto> SetProductStatusAsync(int id, bool isActive)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id) ?? throw ApiException.NotFound("Product not found.");
        product.IsActive = isActive;
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await GetProductAsync(id);
    }

    public async Task<ProductDto> SetStockAsync(int id, int stock)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id) ?? throw ApiException.NotFound("Product not found.");
        product.Stock = stock;
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await GetProductAsync(id);
    }

    private async Task EnsureActiveCategoryAsync(int categoryId)
    {
        if (!await db.Categories.AnyAsync(c => c.Id == categoryId && c.IsActive))
            throw ApiException.Validation("categoryId", "Category does not exist or is inactive.");
    }

    private static void Apply(Product p, ProductRequest r)
    {
        p.Name = r.Name.Trim();
        p.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
        p.Price = r.Price!.Value;
        p.DiscountPercent = r.DiscountPercent ?? 0;
        p.CategoryId = r.CategoryId!.Value;
        p.ImageUrl = string.IsNullOrWhiteSpace(r.ImageUrl) ? null : r.ImageUrl.Trim();
        p.Stock = r.Stock!.Value;
        p.IsActive = r.IsActive;
        p.IsFeatured = r.IsFeatured;
        p.UpdatedAt = DateTime.UtcNow;
    }

    // ---------------- categories ----------------
    public Task<List<CategoryDto>> ListCategoriesAsync() =>
        db.Categories.AsNoTracking().OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Description, c.IsActive, c.Products.Count())).ToListAsync();

    public async Task<CategoryDto> CreateCategoryAsync(CategoryRequest r)
    {
        var name = r.Name.Trim();
        if (await db.Categories.AnyAsync(c => c.Name == name))
            throw ApiException.Conflict("DUPLICATE_CATEGORY", $"A category named '{name}' already exists.");
        var c = new Category { Name = name, Description = Clean(r.Description), IsActive = r.IsActive };
        db.Categories.Add(c);
        await db.SaveChangesAsync();
        return new CategoryDto(c.Id, c.Name, c.Description, c.IsActive, 0);
    }

    public async Task<CategoryDto> UpdateCategoryAsync(int id, CategoryRequest r)
    {
        var c = await db.Categories.FirstOrDefaultAsync(x => x.Id == id) ?? throw ApiException.NotFound("Category not found.");
        var name = r.Name.Trim();
        if (await db.Categories.AnyAsync(x => x.Name == name && x.Id != id))
            throw ApiException.Conflict("DUPLICATE_CATEGORY", $"A category named '{name}' already exists.");
        c.Name = name; c.Description = Clean(r.Description); c.IsActive = r.IsActive;
        await db.SaveChangesAsync();
        return await CategoryDtoAsync(id);
    }

    /// <summary>Deactivating hides the category's products from shoppers and blocks buying them; reactivating restores them.</summary>
    public async Task<CategoryDto> SetCategoryStatusAsync(int id, bool isActive)
    {
        var c = await db.Categories.FirstOrDefaultAsync(x => x.Id == id) ?? throw ApiException.NotFound("Category not found.");
        c.IsActive = isActive;
        await db.SaveChangesAsync();
        return await CategoryDtoAsync(id);
    }

    private Task<CategoryDto> CategoryDtoAsync(int id) =>
        db.Categories.AsNoTracking().Where(c => c.Id == id)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Description, c.IsActive, c.Products.Count())).SingleAsync();

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    // ---------------- customers ----------------
    private IQueryable<User> Customers =>
        db.Users.AsNoTracking().Where(u => u.UserRoles.Any(r => r.Role.Name == Roles.Customer));

    public async Task<PagedResult<AdminUserDto>> ListUsersAsync(AdminUserQuery f)
    {
        var q = Customers;
        if (!string.IsNullOrWhiteSpace(f.Search))
        {
            var s = f.Search.Trim();
            q = q.Where(u => u.FullName.Contains(s) || u.Email.Contains(s));
        }
        if (f.IsActive.HasValue) { var a = f.IsActive.Value; q = q.Where(u => u.IsActive == a); }

        var projected = q.OrderByDescending(u => u.CreatedAt).ThenByDescending(u => u.Id)
            .Select(u => new AdminUserDto(u.Id, u.FullName, u.Email, u.Address, u.IsActive, u.CreatedAt,
                u.Orders.Count(),
                u.Orders.Where(o => o.Status == OrderStatus.Delivered).Sum(o => (decimal?)o.Total) ?? 0m,
                null));
        return await Paging.PageAsync(projected, f.Page, f.PageSize);
    }

    public async Task<AdminUserDto> GetUserAsync(int id)
    {
        var u = await Customers.FirstOrDefaultAsync(x => x.Id == id) ?? throw ApiException.NotFound("Customer not found.");
        var recent = await db.Orders.AsNoTracking().Include(o => o.Items).Include(o => o.Payment).Include(o => o.User)
            .Where(o => o.UserId == id).OrderByDescending(o => o.CreatedAt).Take(5).ToListAsync();
        var count = await db.Orders.CountAsync(o => o.UserId == id);
        var spent = await db.Orders.Where(o => o.UserId == id && o.Status == OrderStatus.Delivered).SumAsync(o => (decimal?)o.Total) ?? 0m;
        return new AdminUserDto(u.Id, u.FullName, u.Email, u.Address, u.IsActive, u.CreatedAt, count, spent,
            recent.Select(o => o.ToDto()).ToList());
    }

    public async Task<AdminUserDto> SetUserStatusAsync(int id, bool isActive)
    {
        if (!await Customers.AnyAsync(u => u.Id == id))
            throw ApiException.NotFound("Customer not found.");   // admins cannot be deactivated through this endpoint
        await db.Users.Where(u => u.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, isActive).SetProperty(u => u.UpdatedAt, DateTime.UtcNow));
        return await GetUserAsync(id);
    }
}
