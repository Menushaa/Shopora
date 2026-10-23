namespace Shopora.Api.Models;

public enum OrderStatus { Pending, Confirmed, Processing, Shipped, Delivered, Cancelled }
public enum PaymentStatus { Pending, Paid, Failed, Refunded }
public enum PaymentMethod { Card, CashOnDelivery }

public static class Roles
{
    public const string Admin = "Admin";
    public const string Customer = "Customer";
}
