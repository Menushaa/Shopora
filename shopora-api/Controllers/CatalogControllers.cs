namespace Shopora.Api.Controllers;

/// <summary>Public product browsing. Only active products in active categories are returned.</summary>
[Route("api/v1/products"), AllowAnonymous]
public class ProductsController(CatalogService catalog) : ApiControllerBase
{
    /// <summary>Search, filter, sort and page through products.</summary>
    [HttpGet] public async Task<ActionResult<ApiResponse<PagedResult<ProductDto>>>> List([FromQuery] ProductQuery query) =>
        Success(await catalog.SearchAsync(query));

    /// <summary>Product details (404 for inactive or unknown products).</summary>
    [HttpGet("{id:int}")] public async Task<ActionResult<ApiResponse<ProductDto>>> Get(int id) => Success(await catalog.GetAsync(id));

    /// <summary>Featured products for the home page.</summary>
    [HttpGet("featured")] public async Task<ActionResult<ApiResponse<List<ProductDto>>>> Featured() => Success(await catalog.FeaturedAsync());

    /// <summary>Newest products.</summary>
    [HttpGet("new-arrivals")] public async Task<ActionResult<ApiResponse<List<ProductDto>>>> NewArrivals() => Success(await catalog.NewArrivalsAsync());

    /// <summary>Discounted products, biggest discount first.</summary>
    [HttpGet("offers")] public async Task<ActionResult<ApiResponse<List<ProductDto>>>> Offers() => Success(await catalog.OffersAsync());
}

/// <summary>Public list of active categories.</summary>
[Route("api/v1/categories"), AllowAnonymous]
public class CategoriesController(CatalogService catalog) : ApiControllerBase
{
    [HttpGet] public async Task<ActionResult<ApiResponse<List<CategoryDto>>>> List() => Success(await catalog.CategoriesAsync());
}

/// <summary>Contact Us form.</summary>
[Route("api/v1/contact"), AllowAnonymous]
public class ContactController(ShoporaDbContext db) : ApiControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status201Created)]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> Send(ContactRequest request)
    {
        db.ContactMessages.Add(new ContactMessage
        {
            Name = request.Name.Trim(), Email = request.Email.Trim().ToLowerInvariant(), Message = request.Message.Trim()
        });
        await db.SaveChangesAsync();
        return CreatedOk(new MessageResponse("Thank you! Your message has been sent. We will get back to you soon."));
    }
}
