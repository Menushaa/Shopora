using System.Security.Cryptography;

namespace Shopora.Api.Services;

public class OrderService(ShoporaDbContext db, ILogger<OrderService> log)
{
    private IQueryable<Order> Orders =>
        db.Orders.AsNoTracking().Include(o => o.Items).Include(o => o.Payment).Include(o => o.User);

    // ---------------- customer ----------------
    public async Task<PagedResult<OrderDto>> MyOrdersAsync(int userId, PageQuery q) =>
        (await Paging.PageAsync(Orders.Where(o => o.UserId == userId).OrderByDescending(o => o.CreatedAt).ThenByDescending(o => o.Id),
            q.Page, q.PageSize)).Map(o => o.ToDto());

    public async Task<OrderDto> GetMineAsync(int userId, int id) =>
        (await Orders.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId)
         ?? throw ApiException.NotFound("Order not found.")).ToDto();   // another customer's order looks like "not found"

    public async Task<CheckoutResult> CheckoutAsync(int userId, CheckoutRequest r)
    {
        var key = string.IsNullOrWhiteSpace(r.IdempotencyKey) ? null : r.IdempotencyKey.Trim();

        // Same key again (double click / retry) -> return the original order, create nothing new.
        if (key != null)
        {
            var previous = await Orders.FirstOrDefaultAsync(o => o.UserId == userId && o.IdempotencyKey == key);
            if (previous != null) return new CheckoutResult(previous.ToDto(), false);
        }

        var cart = await db.Carts.Include(c => c.Items).ThenInclude(i => i.Product).ThenInclude(p => p.Category)
            .SingleOrDefaultAsync(c => c.UserId == userId);
        if (cart == null || cart.Items.Count == 0)
            throw ApiException.Conflict("CART_EMPTY", "Your cart is empty.");

        var ship = await ResolveAddressAsync(userId, r);

        // Re-check everything on the server; nothing the browser sent about prices is used.
        foreach (var item in cart.Items)
        {
            var p = item.Product;
            if (!p.IsActive || !p.Category.IsActive)
                throw ApiException.Conflict("PRODUCT_UNAVAILABLE", $"'{p.Name}' is no longer available. Remove it from your cart to continue.");
            if (item.Quantity > p.Stock)
                throw ApiException.Conflict("INSUFFICIENT_STOCK", p.Stock == 0
                    ? $"'{p.Name}' is out of stock."
                    : $"Only {p.Stock} unit(s) of '{p.Name}' are available.");
        }

        var order = new Order
        {
            OrderNumber = $"SHP-{DateTime.UtcNow:yyyyMMdd}-{Convert.ToHexString(RandomNumberGenerator.GetBytes(3))}",
            UserId = userId,
            Status = OrderStatus.Pending,
            IdempotencyKey = key,
            ShipFullName = ship.FullName, ShipLine1 = ship.Line1, ShipLine2 = ship.Line2,
            ShipCity = ship.City, ShipPostalCode = ship.PostalCode, ShipPhone = ship.Phone,
        };
        foreach (var item in cart.Items)
        {
            var p = item.Product;
            order.Items.Add(new OrderItem
            {
                ProductId = p.Id, ProductName = p.Name, Sku = p.Sku, UnitPrice = p.Price,
                DiscountPercent = p.DiscountPercent, Quantity = item.Quantity, LineTotal = p.FinalPrice * item.Quantity,
            });
        }
        order.Subtotal = cart.Items.Sum(i => i.Product.Price * i.Quantity);
        order.Total = order.Items.Sum(i => i.LineTotal);
        order.DiscountTotal = order.Subtotal - order.Total;

        await using var tx = await db.Database.BeginTransactionAsync();

        // 1) Reserve stock atomically. The WHERE clause makes overselling impossible even with parallel buyers.
        foreach (var item in cart.Items)
        {
            var qty = item.Quantity;
            var pid = item.ProductId;
            var rows = await db.Products.Where(p => p.Id == pid && p.IsActive && p.Stock >= qty)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Stock, p => p.Stock - qty)
                                          .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));
            if (rows == 0)
                throw ApiException.Conflict("INSUFFICIENT_STOCK", $"'{item.Product.Name}' just sold out or changed. Please review your cart.");
        }

        // 2) Simulated payment. Failure throws -> the transaction is rolled back (stock released, no order created).
        var pay = PaymentSimulator.Process(r.PaymentMethod, r.Card);
        if (pay.Status == PaymentStatus.Failed)
        {
            log.LogWarning("Payment {Code} for user {UserId}, card ending {Last4}", pay.FailureCode, userId, pay.CardLast4);
            throw new ApiException(pay.HttpStatus, pay.FailureCode!, pay.FailureMessage!);
        }
        order.Payment = new Payment
        {
            Method = r.PaymentMethod, Status = pay.Status, Amount = order.Total,
            TransactionRef = pay.Reference, CardLast4 = pay.CardLast4,
        };

        // 3) Create the order and empty the cart - all in the same transaction.
        db.Orders.Add(order);
        db.CartItems.RemoveRange(cart.Items);
        cart.UpdatedAt = DateTime.UtcNow;
        try
        {
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException) when (key != null)
        {
            // A parallel request with the same idempotency key won the race.
            db.ChangeTracker.Clear();
            var winner = await Orders.FirstOrDefaultAsync(o => o.UserId == userId && o.IdempotencyKey == key);
            if (winner != null) return new CheckoutResult(winner.ToDto(), false);
            throw;
        }

        log.LogInformation("Order {OrderNumber} created for user {UserId}, total {Total}", order.OrderNumber, userId, order.Total);
        db.ChangeTracker.Clear();
        return new CheckoutResult((await Orders.SingleAsync(o => o.Id == order.Id)).ToDto(), true);
    }

    private async Task<AddressRequest> ResolveAddressAsync(int userId, CheckoutRequest r)
    {
        if (r.AddressId.HasValue)
        {
            var a = await db.Addresses.AsNoTracking().FirstOrDefaultAsync(x => x.Id == r.AddressId && x.UserId == userId)
                ?? throw ApiException.NotFound("Delivery address not found.", "ADDRESS_NOT_FOUND");
            return new AddressRequest(a.Label, a.FullName, a.Line1, a.Line2, a.City, a.PostalCode, a.Phone);
        }
        var n = r.NewAddress!;
        return n with
        {
            FullName = n.FullName.Trim(), Line1 = n.Line1.Trim(), Line2 = string.IsNullOrWhiteSpace(n.Line2) ? null : n.Line2.Trim(),
            City = n.City.Trim(), PostalCode = n.PostalCode.Trim(), Phone = n.Phone.Trim(),
        };
    }

    public async Task<OrderDto> CancelAsync(int userId, int id)
    {
        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId)
            ?? throw ApiException.NotFound("Order not found.");
        return await ChangeStatusAsync(order.Id, order.Status, OrderStatus.Cancelled);
    }

    // ---------------- admin ----------------
    public async Task<PagedResult<OrderDto>> AdminListAsync(AdminOrderQuery q)
    {
        var query = Orders;
        if (q.Status.HasValue) { var st = q.Status.Value; query = query.Where(o => o.Status == st); }
        if (q.From.HasValue) { var from = q.From.Value.Date; query = query.Where(o => o.CreatedAt >= from); }
        if (q.To.HasValue) { var to = q.To.Value.Date.AddDays(1); query = query.Where(o => o.CreatedAt < to); }
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(o => o.OrderNumber.Contains(s) || o.User.FullName.Contains(s) || o.User.Email.Contains(s));
        }
        return (await Paging.PageAsync(query.OrderByDescending(o => o.CreatedAt).ThenByDescending(o => o.Id), q.Page, q.PageSize))
            .Map(o => o.ToDto());
    }

    public async Task<OrderDto> AdminGetAsync(int id) =>
        (await Orders.FirstOrDefaultAsync(o => o.Id == id) ?? throw ApiException.NotFound("Order not found.")).ToDto();

    public async Task<OrderDto> AdminUpdateStatusAsync(int id, OrderStatus next)
    {
        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id)
            ?? throw ApiException.NotFound("Order not found.");
        return await ChangeStatusAsync(order.Id, order.Status, next);
    }

    /// <summary>
    /// The single place where order status changes. Enforces the allowed transitions, and for
    /// Cancelled: restocks items and refunds/voids the payment; for Delivered: settles cash-on-delivery.
    /// </summary>
    private async Task<OrderDto> ChangeStatusAsync(int orderId, OrderStatus from, OrderStatus next)
    {
        if (!Order.Transitions[from].Contains(next))
            throw ApiException.Conflict("INVALID_STATUS_TRANSITION", from is OrderStatus.Delivered or OrderStatus.Cancelled
                ? $"A {from} order can no longer be changed."
                : next == OrderStatus.Cancelled
                    ? $"An order that is {from} can no longer be cancelled."
                    : $"Cannot change order status from {from} to {next}.");

        await using var tx = await db.Database.BeginTransactionAsync();

        // Compare-and-set: if two people change the same order at once, only one wins.
        var rows = await db.Orders.Where(o => o.Id == orderId && o.Status == from)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, next).SetProperty(o => o.UpdatedAt, DateTime.UtcNow));
        if (rows == 0)
            throw ApiException.Conflict("ORDER_CHANGED", "This order was just updated. Please refresh and try again.");

        if (next == OrderStatus.Cancelled)
        {
            var items = await db.OrderItems.Where(i => i.OrderId == orderId).Select(i => new { i.ProductId, i.Quantity }).ToListAsync();
            foreach (var i in items)
            {
                var pid = i.ProductId; var qty = i.Quantity;
                await db.Products.Where(p => p.Id == pid)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Stock, p => p.Stock + qty));
            }
            await db.Payments.Where(p => p.OrderId == orderId && p.Status == PaymentStatus.Paid)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, PaymentStatus.Refunded));
            await db.Payments.Where(p => p.OrderId == orderId && p.Status == PaymentStatus.Pending)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, PaymentStatus.Failed)
                                          .SetProperty(p => p.FailureReason, "Order cancelled"));
        }
        else if (next == OrderStatus.Delivered)
        {
            await db.Payments.Where(p => p.OrderId == orderId && p.Status == PaymentStatus.Pending)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, PaymentStatus.Paid));
        }

        await tx.CommitAsync();
        log.LogInformation("Order {OrderId} status {From} -> {To}", orderId, from, next);
        db.ChangeTracker.Clear();
        return (await Orders.SingleAsync(o => o.Id == orderId)).ToDto();
    }
}
