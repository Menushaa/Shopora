using Microsoft.EntityFrameworkCore;
using Shopora.Api.Models;

namespace Shopora.Api.Data;

public class ShoporaDbContext : DbContext
{
    public ShoporaDbContext(DbContextOptions<ShoporaDbContext> options) : base(options) { }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Wishlist> Wishlists => Set<Wishlist>();
    public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Role>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.Name).HasMaxLength(30);
        });

        b.Entity<User>(e =>
        {
            e.Property(x => x.FullName).HasMaxLength(100);
            e.Property(x => x.Address).HasMaxLength(250);
            e.Property(x => x.Email).HasMaxLength(256).UseCollation("SQL_Latin1_General_CP1_CI_AS");
            e.Property(x => x.PasswordHash).HasMaxLength(100);
            e.HasIndex(x => x.Email).IsUnique();
            e.HasOne(x => x.Cart).WithOne(c => c.User).HasForeignKey<Cart>(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Wishlist).WithOne(w => w.User).HasForeignKey<Wishlist>(w => w.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Orders).WithOne(o => o.User).HasForeignKey(o => o.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<UserRole>(e =>
        {
            e.HasKey(x => new { x.UserId, x.RoleId });
        });

        b.Entity<Address>(e =>
        {
            e.Property(x => x.Label).HasMaxLength(30);
            e.Property(x => x.FullName).HasMaxLength(100);
            e.Property(x => x.Line1).HasMaxLength(150);
            e.Property(x => x.Line2).HasMaxLength(150);
            e.Property(x => x.City).HasMaxLength(80);
            e.Property(x => x.PostalCode).HasMaxLength(12);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.HasIndex(x => x.UserId).IsUnique().HasFilter("[IsDefault] = 1").HasDatabaseName("UX_Addresses_OneDefault");
        });

        b.Entity<Category>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(80);
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasIndex(x => x.Name).IsUnique();
        });

        b.Entity<Product>(e =>
        {
            e.Property(x => x.Sku).HasMaxLength(40);
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.Price).HasColumnType("decimal(18,2)");
            e.Property(x => x.DiscountPercent).HasColumnType("decimal(5,2)");
            e.Ignore(x => x.FinalPrice);
            e.HasIndex(x => x.Sku).IsUnique();
            e.HasIndex(x => x.Name);
            e.HasOne(x => x.Category).WithMany(c => c.Products).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Products_Price", "[Price] > 0");
                t.HasCheckConstraint("CK_Products_Discount", "[DiscountPercent] BETWEEN 0 AND 100");
                t.HasCheckConstraint("CK_Products_Stock", "[Stock] >= 0");
            });
        });

        b.Entity<CartItem>(e =>
        {
            e.HasIndex(x => new { x.CartId, x.ProductId }).IsUnique();
            e.HasOne(x => x.Cart).WithMany(c => c.Items).HasForeignKey(x => x.CartId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_CartItems_Qty", "[Quantity] > 0"));
        });

        b.Entity<WishlistItem>(e =>
        {
            e.HasIndex(x => new { x.WishlistId, x.ProductId }).IsUnique();
            e.HasOne(x => x.Wishlist).WithMany(w => w.Items).HasForeignKey(x => x.WishlistId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Order>(e =>
        {
            e.Property(x => x.OrderNumber).HasMaxLength(30);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Subtotal).HasColumnType("decimal(18,2)");
            e.Property(x => x.DiscountTotal).HasColumnType("decimal(18,2)");
            e.Property(x => x.Total).HasColumnType("decimal(18,2)");
            e.Property(x => x.ShipFullName).HasMaxLength(100);
            e.Property(x => x.ShipLine1).HasMaxLength(150);
            e.Property(x => x.ShipLine2).HasMaxLength(150);
            e.Property(x => x.ShipCity).HasMaxLength(80);
            e.Property(x => x.ShipPostalCode).HasMaxLength(12);
            e.Property(x => x.ShipPhone).HasMaxLength(20);
            e.Property(x => x.IdempotencyKey).HasMaxLength(64);
            e.Ignore(x => x.IsCancellable);
            e.HasIndex(x => x.OrderNumber).IsUnique();
            e.HasIndex(x => new { x.UserId, x.IdempotencyKey }).IsUnique().HasFilter("[IdempotencyKey] IS NOT NULL").HasDatabaseName("UX_Orders_Idempotency");
        });

        b.Entity<OrderItem>(e =>
        {
            e.Property(x => x.ProductName).HasMaxLength(150);
            e.Property(x => x.Sku).HasMaxLength(40);
            e.Property(x => x.UnitPrice).HasColumnType("decimal(18,2)");
            e.Property(x => x.DiscountPercent).HasColumnType("decimal(5,2)");
            e.Property(x => x.LineTotal).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Order).WithMany(o => o.Items).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Payment>(e =>
        {
            e.Property(x => x.Method).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            e.Property(x => x.TransactionRef).HasMaxLength(40);
            e.Property(x => x.CardLast4).HasMaxLength(4).IsFixedLength();
            e.Property(x => x.FailureReason).HasMaxLength(200);
            e.HasIndex(x => x.OrderId).IsUnique();
            e.HasOne(x => x.Order).WithOne(o => o.Payment).HasForeignKey<Payment>(p => p.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<PasswordResetToken>(e =>
        {
            e.Property(x => x.TokenHash).HasMaxLength(100);
            e.HasIndex(x => x.TokenHash);
        });

        b.Entity<ContactMessage>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.Message).HasMaxLength(1000);
        });
    }
}
