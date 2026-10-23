using Microsoft.EntityFrameworkCore;
using Shopora.Api.Models;

namespace Shopora.Api.Data;

/// <summary>
/// Creates the known data set used for manual and automated testing.
/// Passwords are hashed with BCrypt at seed time - nothing sensitive is hard-coded as a hash.
/// </summary>
public static class DbSeeder
{
    // ---- Test accounts (documented in README) -------------------------------------------
    public const string AdminEmail = "admin@shopora.test";
    public const string AdminPassword = "Admin@12345";
    public const string Customer1Email = "customer1@shopora.test";
    public const string Customer2Email = "customer2@shopora.test";
    public const string CustomerPassword = "Customer@123";

    private static readonly string[] CategoryNames =
    {
        "Electronics", "Fashion", "Home & Kitchen", "Beauty & Care", "Books & Stationery", "Sports & Outdoors"
    };

    private static readonly string[] CategoryDescriptions =
    {
        "Gadgets, audio and accessories for everyday life.",
        "Clothing, footwear and accessories for every style.",
        "Everything to make your home warm and your kitchen smart.",
        "Skincare, haircare and personal grooming essentials.",
        "Books, planners and stationery for study and work.",
        "Fitness gear and equipment for active living.",
    };

    // (categoryIndex, name, price LKR, discount %, stock)
    // Edge cases for testers: stock 0 (out of stock), stock <= 5 (low stock), inactive product.
    private static readonly (int Cat, string Name, decimal Price, decimal Disc, int Stock)[] ProductData =
    {
        (0, "Wireless Earbuds Pro", 14900, 10, 50),
        (0, "Smart Watch Series 5", 24900, 0, 30),
        (0, "Bluetooth Speaker Mini", 7900, 15, 40),
        (0, "20000mAh Power Bank", 5900, 0, 60),
        (0, "USB-C Fast Charger 65W", 4500, 0, 3),          // low stock
        (0, "4K Action Camera", 32900, 20, 12),
        (0, "Mechanical Keyboard", 11900, 0, 0),             // out of stock
        (1, "Classic Cotton T-Shirt", 1990, 0, 120),
        (1, "Slim Fit Denim Jeans", 6490, 10, 45),
        (1, "Canvas Sneakers", 5990, 0, 35),
        (1, "Leather Wallet", 3490, 0, 25),
        (1, "Summer Floral Dress", 4990, 25, 18),
        (1, "Hooded Sweatshirt", 4290, 0, 0),                // out of stock
        (1, "Aviator Sunglasses", 2990, 0, 40),
        (2, "Non-Stick Frying Pan", 3290, 0, 40),
        (2, "Electric Kettle 1.7L", 4990, 10, 30),
        (2, "Stainless Steel Water Bottle", 1890, 0, 80),
        (2, "Ceramic Dinner Set", 12900, 15, 10),
        (2, "Memory Foam Pillow", 3990, 0, 25),
        (2, "Air Fryer 4L", 18900, 12, 14),
        (2, "LED Desk Lamp", 2490, 0, 4),                    // low stock
        (3, "Vitamin C Face Serum", 2890, 0, 60),
        (3, "Hydrating Moisturizer", 2190, 10, 70),
        (3, "Herbal Shampoo", 1290, 0, 90),
        (3, "Matte Lipstick Set", 3190, 20, 35),
        (3, "Sunscreen SPF 50", 1790, 0, 0),                 // out of stock
        (3, "Electric Hair Dryer", 5490, 0, 20),
        (4, "The Art of Clean Code", 3890, 0, 50),
        (4, "Productivity Planner", 1490, 0, 100),
        (4, "Gel Pen Set (12 pcs)", 790, 0, 200),
        (4, "Hardcover Notebook A5", 990, 0, 150),
        (4, "Learn Test Automation", 4290, 15, 40),
        (4, "Desk Organizer Set", 1890, 0, 3),               // low stock
        (5, "Yoga Mat 6mm", 2490, 0, 60),
        (5, "Adjustable Dumbbell Set", 14900, 10, 15),
        (5, "Running Shoes", 8990, 20, 28),
        (5, "Cricket Bat (Willow)", 12900, 0, 8),
        (5, "Resistance Bands Set", 1590, 0, 75),
        (5, "Camping Backpack 40L", 7490, 0, 22),
        (5, "Discontinued Fitness Tracker", 6900, 0, 5),     // inactive product
    };

    private static readonly string[] CategoryCodes = { "ELE", "FAS", "HOM", "BEA", "BOK", "SPO" };

    /// <summary>Seeds only when the database is empty (safe to call on every startup).</summary>
    public static async Task SeedAsync(ShoporaDbContext db)
    {
        if (await db.Users.AnyAsync()) return;

        // Roles
        foreach (var name in new[] { Roles.Admin, Roles.Customer })
            if (!await db.Roles.AnyAsync(r => r.Name == name)) db.Roles.Add(new Role { Name = name });
        await db.SaveChangesAsync();
        var adminRole = await db.Roles.SingleAsync(r => r.Name == Roles.Admin);
        var customerRole = await db.Roles.SingleAsync(r => r.Name == Roles.Customer);

        // Users
        var admin = NewUser("Shopora Admin", "Head Office, Colombo 03", AdminEmail, AdminPassword, adminRole);
        var c1 = NewUser("Nimal Perera", "25 Galle Road, Colombo 04", Customer1Email, CustomerPassword, customerRole);
        var c2 = NewUser("Kasuni Fernando", "12 Temple Road, Kandy", Customer2Email, CustomerPassword, customerRole);
        db.Users.AddRange(admin, c1, c2);

        // Customers get a cart, a wishlist and a default address
        foreach (var (u, line1, city, postal, phone) in new[]
        {
            (c1, "25 Galle Road", "Colombo", "00400", "0771234567"),
            (c2, "12 Temple Road", "Kandy", "20000", "0719876543"),
        })
        {
            u.Cart = new Cart();
            u.Wishlist = new Wishlist();
            u.Addresses.Add(new Address
            {
                Label = "Home", FullName = u.FullName, Line1 = line1, City = city,
                PostalCode = postal, Phone = phone, IsDefault = true
            });
        }
        await db.SaveChangesAsync();

        // Categories
        var categories = CategoryNames
            .Select((n, i) => new Category { Name = n, Description = CategoryDescriptions[i], IsActive = true })
            .ToList();
        db.Categories.AddRange(categories);
        await db.SaveChangesAsync();

        // Products
        var now = DateTime.UtcNow;
        var counters = new int[CategoryNames.Length];
        var products = new List<Product>();
        for (var i = 0; i < ProductData.Length; i++)
        {
            var d = ProductData[i];
            var sku = $"{CategoryCodes[d.Cat]}-{++counters[d.Cat]:000}";
            products.Add(new Product
            {
                Sku = sku,
                Name = d.Name,
                Description = $"{d.Name} - quality you can trust, from the Shopora collection. " +
                              "Backed by our 7-day easy return promise.",
                Price = d.Price,
                DiscountPercent = d.Disc,
                CategoryId = categories[d.Cat].Id,
                ImageUrl = $"https://picsum.photos/seed/{sku}/600/600",
                Stock = d.Stock,
                IsActive = !d.Name.StartsWith("Discontinued"),
                IsFeatured = counters[d.Cat] <= 2,                 // first two per category are featured
                CreatedAt = now.AddDays(-(ProductData.Length - i)),  // later rows = newer arrivals
                UpdatedAt = now,
            });
        }
        db.Products.AddRange(products);
        await db.SaveChangesAsync();

        // Sample orders for customer1 (one Delivered, one Pending) so reports/history are never empty
        var home = c1.Addresses.First();
        db.Orders.Add(BuildOrder("SHP-SEED-0001", c1, home, OrderStatus.Delivered, 20,
            (products[0], 1), (products[7], 2)));
        db.Orders.Add(BuildOrder("SHP-SEED-0002", c1, home, OrderStatus.Pending, 1,
            (products[16], 1), (products[29], 3)));
        await db.SaveChangesAsync();
    }

    /// <summary>Wipes all business data and re-seeds the known data set. Test/Dev only.</summary>
    public static async Task ResetAsync(ShoporaDbContext db)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        foreach (var table in new[]
        {
            "Payments", "OrderItems", "Orders", "CartItems", "Carts", "WishlistItems", "Wishlists",
            "PasswordResetTokens", "ContactMessages", "Addresses", "UserRoles", "Users", "Products", "Categories"
        })
        {
#pragma warning disable EF1002 // table names are a fixed internal list, not user input
            await db.Database.ExecuteSqlRawAsync($"DELETE FROM dbo.[{table}]");
            // restart identity at 1 so IDs are predictable after every reset (only if the table was ever used)
            if (table != "UserRoles")
                await db.Database.ExecuteSqlRawAsync(
                    $"IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.{table}') AND last_value IS NOT NULL) " +
                    $"DBCC CHECKIDENT ('dbo.{table}', RESEED, 0)");
#pragma warning restore EF1002
        }
        await tx.CommitAsync();
        db.ChangeTracker.Clear();
        await SeedAsync(db);
    }

    // ---- helpers -------------------------------------------------------------------------
    private static User NewUser(string name, string address, string email, string password, Role role)
    {
        var user = new User
        {
            FullName = name, Address = address, Email = email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11),
        };
        user.UserRoles.Add(new UserRole { User = user, Role = role });
        return user;
    }

    private static Order BuildOrder(string number, User user, Address addr, OrderStatus status, int daysAgo,
        params (Product Product, int Qty)[] lines)
    {
        var order = new Order
        {
            OrderNumber = number, User = user, Status = status,
            ShipFullName = addr.FullName, ShipLine1 = addr.Line1, ShipLine2 = addr.Line2,
            ShipCity = addr.City, ShipPostalCode = addr.PostalCode, ShipPhone = addr.Phone,
            CreatedAt = DateTime.UtcNow.AddDays(-daysAgo), UpdatedAt = DateTime.UtcNow.AddDays(-daysAgo),
        };
        foreach (var (p, q) in lines)
        {
            order.Items.Add(new OrderItem
            {
                Product = p, ProductName = p.Name, Sku = p.Sku, UnitPrice = p.Price,
                DiscountPercent = p.DiscountPercent, Quantity = q, LineTotal = p.FinalPrice * q,
            });
        }
        order.Subtotal = lines.Sum(l => l.Product.Price * l.Qty);
        order.Total = order.Items.Sum(i => i.LineTotal);
        order.DiscountTotal = order.Subtotal - order.Total;
        order.Payment = new Payment
        {
            Method = PaymentMethod.Card, Status = PaymentStatus.Paid, Amount = order.Total,
            TransactionRef = $"SIM-{number}", CardLast4 = "1111",
        };
        return order;
    }
}
