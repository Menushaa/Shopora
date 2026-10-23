using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Shopora.Api.Controllers;
using Shopora.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------- logging (console + rolling file; logs/ is git-ignored) ----------
builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/shopora-.log", rollingInterval: RollingInterval.Day));

// ---------- database ----------
var connectionString = config.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");
builder.Services.AddDbContext<ShoporaDbContext>(o => o.UseSqlServer(connectionString));

// ---------- JWT settings (the signing key is NEVER stored in source control) ----------
// Set it with:  dotnet user-secrets set "Jwt:Key" "<at least 32 random characters>"   or env var Jwt__Key
var jwtKey = config["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    if (builder.Environment.IsProduction())
        throw new InvalidOperationException("Jwt:Key must be configured in Production.");
    jwtKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)); // dev/test: new key each start (sessions reset on restart)
}
if (jwtKey.Length < 32) throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");
var jwt = new JwtSettings(jwtKey, config["Jwt:Issuer"] ?? "shopora-api", config["Jwt:Audience"] ?? "shopora-web");

// ---------- MVC, JSON, validation ----------
builder.Services.AddControllers(o => o.Filters.Add<ValidationFilter>())
    .ConfigureApiBehaviorOptions(o => o.SuppressModelStateInvalidFilter = true) // our filter returns the standard envelope
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// ---------- application services ----------
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<TokenRevocationStore>();
builder.Services.AddSingleton<DevTokenStore>();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<CatalogService>();
builder.Services.AddScoped<CartService>();
builder.Services.AddScoped<WishlistService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<AdminService>();
builder.Services.AddScoped<ReportService>();

// ---------- authentication: JWT read from the HttpOnly cookie (or an Authorization: Bearer header) ----------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = jwt.Issuer,
        ValidateAudience = true, ValidAudience = jwt.Audience,
        ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
        ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1),
        RoleClaimType = "role", NameClaimType = "name",
    };
    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            if (ctx.Request.Cookies.TryGetValue(AuthController.CookieName, out var cookieToken)) ctx.Token = cookieToken;
            return Task.CompletedTask;
        },
        OnTokenValidated = async ctx =>
        {
            // Reject tokens that were logged out, or that belong to a deactivated/deleted account.
            var revoked = ctx.HttpContext.RequestServices.GetRequiredService<TokenRevocationStore>();
            if (revoked.IsRevoked(ctx.Principal?.FindFirst("jti")?.Value)) { ctx.Fail("Token was revoked."); return; }
            if (!int.TryParse(ctx.Principal?.FindFirst("uid")?.Value, out var uid)) { ctx.Fail("Invalid token."); return; }
            var db = ctx.HttpContext.RequestServices.GetRequiredService<ShoporaDbContext>();
            if (!await db.Users.AnyAsync(u => u.Id == uid && u.IsActive)) ctx.Fail("Account is inactive.");
        },
    };
});
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Policies.AdminOnly, p => p.RequireRole(Roles.Admin))
    .AddPolicy(Policies.CustomerOnly, p => p.RequireRole(Roles.Customer));

// ---------- CORS (strict allow-list; credentials needed for the cookie) ----------
var origins = config.GetSection("Cors:Origins").Get<string[]>() ?? new[] { "http://localhost:5173" };
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

// ---------- rate limiting on login (per IP) ----------
var loginLimit = config.GetValue("RateLimit:LoginPerMinute", 10);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = loginLimit, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});

// ---------- Swagger / OpenAPI ----------
var testEndpoints = config.GetValue<bool>("Features:TestEndpoints");
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Shopora API",
        Version = "v1",
        Description = "Your World of Shopping - REST API.\n\n" +
            "**How to authorize in this page:** call `POST /api/v1/auth/login` once. The browser keeps the HttpOnly cookie, " +
            "so every other request here is authenticated automatically. (Postman/scripts can instead send " +
            "`Authorization: Bearer <token>`; the token is returned in the login response in Dev/Test only.)\n\n" +
            "Every response is `{ success, data, error: { code, message, fields } }`.",
    });
    var xml = Path.Combine(AppContext.BaseDirectory, $"{typeof(Program).Assembly.GetName().Name}.xml");
    if (File.Exists(xml)) c.IncludeXmlComments(xml);
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT", In = ParameterLocation.Header,
        Description = "Optional. Paste a JWT here to call secured endpoints with a header instead of the login cookie.",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = Array.Empty<string>(),
    });
    // Test endpoints are documented only when they are enabled (Test environment).
    c.DocInclusionPredicate((_, api) => testEndpoints || api.RelativePath?.StartsWith("api/v1/test") != true);
});

var app = builder.Build();

// ---------- pipeline ----------
app.UseSerilogRequestLogging();
app.UseCors();                                   // before the exception middleware so error responses keep CORS headers
app.UseMiddleware<ExceptionMiddleware>();
app.UseStatusCodePages(async ctx =>               // empty 401/403/404/405/429 responses also use the standard envelope
{
    var r = ctx.HttpContext.Response;
    var (code, message) = r.StatusCode switch
    {
        401 => ("UNAUTHORIZED", "Authentication is required."),
        403 => ("FORBIDDEN", "You do not have permission to perform this action."),
        404 => ("NOT_FOUND", "The requested resource was not found."),
        405 => ("METHOD_NOT_ALLOWED", "This HTTP method is not allowed for the resource."),
        415 => ("UNSUPPORTED_MEDIA_TYPE", "Send the request body as application/json."),
        429 => ("TOO_MANY_REQUESTS", "Too many requests. Please try again later."),
        var s => ($"HTTP_{s}", "The request could not be completed."),
    };
    await r.WriteAsJsonAsync(ApiResponse.Fail(code, message));
});
if (app.Environment.IsProduction()) app.UseHttpsRedirection();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Test"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ShoporaDbContext>();
    await db.Database.EnsureCreatedAsync();      // no-op when database/01_schema.sql already created the tables
    await DbSeeder.SeedAsync(db);

    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Shopora API v1");
        c.DocumentTitle = "Shopora API";
        c.EnablePersistAuthorization();
    });
}

app.MapControllers();
app.MapGet("/health", async (ShoporaDbContext db) => Results.Ok(new
{
    status = "ok", app = "Shopora API", environment = app.Environment.EnvironmentName,
    products = await db.Products.CountAsync(), users = await db.Users.CountAsync(),
})).ExcludeFromDescription();

app.Run();

public partial class Program { }
