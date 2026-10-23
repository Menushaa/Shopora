namespace Shopora.Api.Services;

public class ReportService(ShoporaDbContext db)
{
    private const int Low = AdminService.LowStockThreshold;

    public async Task<DashboardSummaryDto> DashboardAsync()
    {
        var recent = await db.Orders.AsNoTracking().Include(o => o.Items).Include(o => o.Payment).Include(o => o.User)
            .OrderByDescending(o => o.CreatedAt).Take(5).ToListAsync();
        return new DashboardSummaryDto(
            await db.Products.CountAsync(),
            await db.Products.CountAsync(p => p.IsActive),
            await db.Products.CountAsync(p => p.IsActive && p.Stock > 0 && p.Stock <= Low),
            await db.Products.CountAsync(p => p.IsActive && p.Stock == 0),
            await db.Users.CountAsync(u => u.UserRoles.Any(r => r.Role.Name == Roles.Customer)),
            await db.Orders.CountAsync(),
            await db.Orders.CountAsync(o => o.Status == OrderStatus.Pending),
            await db.Orders.CountAsync(o => o.Status == OrderStatus.Delivered),
            await db.Orders.Where(o => o.Status == OrderStatus.Delivered).SumAsync(o => (decimal?)o.Total) ?? 0m,
            recent.Select(o => o.ToDto()).ToList());
    }

    /// <summary>Low stock = 1 to 5 units; out of stock = 0 units. Only active products are listed.</summary>
    public async Task<InventoryReportDto> InventoryAsync()
    {
        var active = db.Products.AsNoTracking().Include(p => p.Category).Where(p => p.IsActive);
        var low = await active.Where(p => p.Stock > 0 && p.Stock <= Low).OrderBy(p => p.Stock).ThenBy(p => p.Name).ToListAsync();
        var out0 = await active.Where(p => p.Stock == 0).OrderBy(p => p.Name).ToListAsync();
        return new InventoryReportDto(Low, await db.Products.CountAsync(),
            low.Select(p => p.ToDto()).ToList(), out0.Select(p => p.ToDto()).ToList());
    }

    /// <summary>Sales count Delivered orders only, dated by the day they were delivered. Defaults to the last 30 days.</summary>
    public async Task<SalesReportDto> SalesAsync(SalesQuery q)
    {
        var to = (q.To ?? DateTime.UtcNow).Date;
        var from = (q.From ?? to.AddDays(-29)).Date;
        var end = to.AddDays(1);

        var orders = await db.Orders.AsNoTracking().Include(o => o.Items)
            .Where(o => o.Status == OrderStatus.Delivered && o.UpdatedAt >= from && o.UpdatedAt < end).ToListAsync();

        var daily = orders.GroupBy(o => DateOnly.FromDateTime(o.UpdatedAt)).OrderBy(g => g.Key)
            .Select(g => new DailySalesDto(g.Key, g.Count(), g.Sum(o => o.Total))).ToList();
        var top = orders.SelectMany(o => o.Items).GroupBy(i => new { i.ProductName, i.Sku })
            .Select(g => new TopProductDto(g.Key.ProductName, g.Key.Sku, g.Sum(i => i.Quantity), g.Sum(i => i.LineTotal)))
            .OrderByDescending(t => t.Revenue).Take(5).ToList();

        return new SalesReportDto(from, to, orders.Sum(o => o.Total), orders.Count,
            orders.SelectMany(o => o.Items).Sum(i => i.Quantity), daily, top);
    }
}
