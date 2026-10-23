namespace Shopora.Api.Models;

public class Order
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = "";
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public decimal Subtotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal Total { get; set; }

    // Delivery address snapshot
    public string ShipFullName { get; set; } = "";
    public string ShipLine1 { get; set; } = "";
    public string? ShipLine2 { get; set; }
    public string ShipCity { get; set; } = "";
    public string ShipPostalCode { get; set; } = "";
    public string ShipPhone { get; set; } = "";

    public string? IdempotencyKey { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<OrderItem> Items { get; set; } = new();
    public Payment? Payment { get; set; }

    /// <summary>Allowed forward transitions. Cancellation rules are enforced separately.</summary>
    public static readonly IReadOnlyDictionary<OrderStatus, OrderStatus[]> Transitions =
        new Dictionary<OrderStatus, OrderStatus[]>
        {
            [OrderStatus.Pending]    = new[] { OrderStatus.Confirmed, OrderStatus.Cancelled },
            [OrderStatus.Confirmed]  = new[] { OrderStatus.Processing, OrderStatus.Cancelled },
            [OrderStatus.Processing] = new[] { OrderStatus.Shipped },
            [OrderStatus.Shipped]    = new[] { OrderStatus.Delivered },
            [OrderStatus.Delivered]  = Array.Empty<OrderStatus>(),
            [OrderStatus.Cancelled]  = Array.Empty<OrderStatus>(),
        };

    public bool CanMoveTo(OrderStatus next) => Transitions[Status].Contains(next);
    public bool IsCancellable => Status is OrderStatus.Pending or OrderStatus.Confirmed;
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string ProductName { get; set; } = "";
    public string Sku { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
}

public class Payment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; }
    public decimal Amount { get; set; }
    public string? TransactionRef { get; set; }
    public string? CardLast4 { get; set; }
    public string? FailureReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
