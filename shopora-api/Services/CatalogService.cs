namespace Shopora.Api.Services;

public class CatalogService(ShoporaDbContext db)
{
    /// <summary>Applies search, category, price (after discount) filters and sorting. Shared with the admin list.</summary>
    public static IQueryable<Product> ApplyFilters(IQueryable<Product> q, ProductQuery f)
    {
        if (!string.IsNullOrWhiteSpace(f.Search))
        {
            var s = f.Search.Trim();
            q = q.Where(p => p.Name.Contains(s) || (p.Description != null && p.Description.Contains(s)) || p.Sku.Contains(s));
        }
        if (f.CategoryId.HasValue) { var c = f.CategoryId.Value; q = q.Where(p => p.CategoryId == c); }
        if (f.MinPrice.HasValue) { var min = f.MinPrice.Value; q = q.Where(p => p.Price * (1 - p.DiscountPercent / 100m) >= min); }
        if (f.MaxPrice.HasValue) { var max = f.MaxPrice.Value; q = q.Where(p => p.Price * (1 - p.DiscountPercent / 100m) <= max); }

        return f.Sort switch
        {
            "name_asc" => q.OrderBy(p => p.Name).ThenBy(p => p.Id),
            "name_desc" => q.OrderByDescending(p => p.Name).ThenBy(p => p.Id),
            "price_asc" => q.OrderBy(p => p.Price * (1 - p.DiscountPercent / 100m)).ThenBy(p => p.Id),
            "price_desc" => q.OrderByDescending(p => p.Price * (1 - p.DiscountPercent / 100m)).ThenBy(p => p.Id),
            _ => q.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id),
        };
    }

    /// <summary>Products a shopper may see: active product in an active category.</summary>
    private IQueryable<Product> Visible =>
        db.Products.AsNoTracking().Include(p => p.Category).Where(p => p.IsActive && p.Category.IsActive);

    public async Task<PagedResult<ProductDto>> SearchAsync(ProductQuery f) =>
        (await Paging.PageAsync(ApplyFilters(Visible, f), f.Page, f.PageSize)).Map(p => p.ToDto());

    public async Task<ProductDto> GetAsync(int id) =>
        (await Visible.FirstOrDefaultAsync(p => p.Id == id) ?? throw ApiException.NotFound("Product not found.")).ToDto();

    public async Task<List<ProductDto>> FeaturedAsync(int take = 8) =>
        (await Visible.Where(p => p.IsFeatured).OrderByDescending(p => p.CreatedAt).Take(take).ToListAsync())
        .Select(p => p.ToDto()).ToList();

    public async Task<List<ProductDto>> NewArrivalsAsync(int take = 8) =>
        (await Visible.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id).Take(take).ToListAsync())
        .Select(p => p.ToDto()).ToList();

    public async Task<List<ProductDto>> OffersAsync(int take = 8) =>
        (await Visible.Where(p => p.DiscountPercent > 0).OrderByDescending(p => p.DiscountPercent).ThenBy(p => p.Id)
            .Take(take).ToListAsync()).Select(p => p.ToDto()).ToList();

    public Task<List<CategoryDto>> CategoriesAsync() =>
        db.Categories.AsNoTracking().Where(c => c.IsActive).OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Description, c.IsActive, c.Products.Count(p => p.IsActive)))
            .ToListAsync();
}
