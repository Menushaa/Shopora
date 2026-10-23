using System.Text.RegularExpressions;
using FluentValidation;

namespace Shopora.Api.Validators;

public class ProductRequestValidator : AbstractValidator<ProductRequest>
{
    public ProductRequestValidator()
    {
        RuleFor(x => x.Name).Cascade(CascadeMode.Stop).Required("Product name")
            .Must(s => s.Trim().Length >= 3).WithMessage("Product name must be at least 3 characters.")
            .MaxTrimmed(150, "Product name");
        RuleFor(x => x.Description).MaximumLength(2000).WithMessage("Description must be at most 2000 characters.");
        RuleFor(x => x.Sku).Matches(@"^[A-Za-z0-9\-_]{2,40}$")
            .WithMessage("SKU must be 2-40 letters, digits, '-' or '_'.").When(x => !string.IsNullOrWhiteSpace(x.Sku));
        RuleFor(x => x.Price).Cascade(CascadeMode.Stop).NotNull().WithMessage("Price is required.")
            .GreaterThan(0m).WithMessage("Price must be greater than 0.")
            .PrecisionScale(10, 2, true).WithMessage("Price may have at most 2 decimal places and 8 whole digits.");
        RuleFor(x => x.DiscountPercent).Cascade(CascadeMode.Stop)
            .InclusiveBetween(0m, 100m).WithMessage("Discount must be between 0 and 100.")
            .PrecisionScale(5, 2, true).WithMessage("Discount may have at most 2 decimal places.")
            .When(x => x.DiscountPercent.HasValue);
        RuleFor(x => x.CategoryId).Cascade(CascadeMode.Stop).NotNull().WithMessage("Category is required.")
            .GreaterThan(0).WithMessage("Category is invalid.");
        RuleFor(x => x.Stock).Cascade(CascadeMode.Stop).NotNull().WithMessage("Stock is required.")
            .InclusiveBetween(0, 1_000_000).WithMessage("Stock must be between 0 and 1,000,000.");
        RuleFor(x => x.ImageUrl).MaximumLength(500).WithMessage("Image URL must be at most 500 characters.")
            .Must(u => u!.StartsWith('/') || (Uri.TryCreate(u, UriKind.Absolute, out var uri) &&
                       (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)))
            .WithMessage("Image URL must be an http(s) URL or a site-relative path.")
            .When(x => !string.IsNullOrWhiteSpace(x.ImageUrl));
    }
}

public class CategoryRequestValidator : AbstractValidator<CategoryRequest>
{
    public CategoryRequestValidator()
    {
        RuleFor(x => x.Name).Cascade(CascadeMode.Stop).Required("Category name")
            .Must(s => s.Trim().Length >= 2).WithMessage("Category name must be at least 2 characters.")
            .MaxTrimmed(80, "Category name");
        RuleFor(x => x.Description).MaximumLength(500).WithMessage("Description must be at most 500 characters.");
    }
}

public class StatusRequestValidator : AbstractValidator<StatusRequest>
{
    public StatusRequestValidator() => RuleFor(x => x.IsActive).NotNull().WithMessage("isActive is required.");
}

public class StockRequestValidator : AbstractValidator<StockRequest>
{
    public StockRequestValidator() =>
        RuleFor(x => x.Stock).Cascade(CascadeMode.Stop).NotNull().WithMessage("Stock is required.")
            .InclusiveBetween(0, 1_000_000).WithMessage("Stock must be between 0 and 1,000,000.");
}

// ---- query validators ----
public abstract class ProductQueryRules<T> : AbstractValidator<T> where T : ProductQuery
{
    private static readonly string[] Sorts = { "newest", "name_asc", "name_desc", "price_asc", "price_desc" };

    protected ProductQueryRules()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1).WithMessage("Page must be 1 or greater.");
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50).WithMessage("Page size must be between 1 and 50.");
        RuleFor(x => x.MinPrice).GreaterThanOrEqualTo(0m).WithMessage("Minimum price cannot be negative.").When(x => x.MinPrice.HasValue);
        RuleFor(x => x.MaxPrice).GreaterThanOrEqualTo(0m).WithMessage("Maximum price cannot be negative.").When(x => x.MaxPrice.HasValue);
        RuleFor(x => x).Must(x => x.MinPrice <= x.MaxPrice)
            .WithMessage("Minimum price cannot be greater than maximum price.").OverridePropertyName("minPrice")
            .When(x => x.MinPrice.HasValue && x.MaxPrice.HasValue);
        RuleFor(x => x.Sort).Must(s => Sorts.Contains(s)).WithMessage("Sort must be one of: " + string.Join(", ", Sorts) + ".");
        RuleFor(x => x.Search).MaximumLength(100).WithMessage("Search text must be at most 100 characters.");
    }
}
public class ProductQueryValidator : ProductQueryRules<ProductQuery> { }
public class AdminProductQueryValidator : ProductQueryRules<AdminProductQuery>
{
    public AdminProductQueryValidator()
    {
        RuleFor(x => x.Status).Must(s => s is "all" or "active" or "inactive").WithMessage("Status must be all, active or inactive.");
        RuleFor(x => x.Stock).Must(s => s is "all" or "low" or "out").WithMessage("Stock must be all, low or out.");
    }
}

public abstract class PageQueryRules<T> : AbstractValidator<T> where T : PageQuery
{
    protected PageQueryRules()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1).WithMessage("Page must be 1 or greater.");
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100).WithMessage("Page size must be between 1 and 100.");
        RuleFor(x => x.Search).MaximumLength(100).WithMessage("Search text must be at most 100 characters.");
    }
}
public class PageQueryValidator : PageQueryRules<PageQuery> { }
public class AdminUserQueryValidator : PageQueryRules<AdminUserQuery> { }
public class AdminOrderQueryValidator : PageQueryRules<AdminOrderQuery>
{
    public AdminOrderQueryValidator() =>
        RuleFor(x => x).Must(x => x.From <= x.To).WithMessage("'From' date cannot be after 'To' date.")
            .OverridePropertyName("from").When(x => x.From.HasValue && x.To.HasValue);
}

public class SalesQueryValidator : AbstractValidator<SalesQuery>
{
    public SalesQueryValidator()
    {
        RuleFor(x => x).Must(x => x.From <= x.To).WithMessage("'From' date cannot be after 'To' date.")
            .OverridePropertyName("from").When(x => x.From.HasValue && x.To.HasValue);
        RuleFor(x => x).Must(x => (x.To!.Value - x.From!.Value).TotalDays <= 366)
            .WithMessage("The date range cannot exceed 366 days.").OverridePropertyName("to")
            .When(x => x.From.HasValue && x.To.HasValue && x.From <= x.To);
    }
}
