namespace Shopora.Api.Services;

public record PaymentResult(PaymentStatus Status, string? Reference, string? CardLast4,
    int HttpStatus = 0, string? FailureCode = null, string? FailureMessage = null);

/// <summary>
/// Simulated payment gateway - no real money. Outcomes are fully predictable:
///   4111 1111 1111 1111 -> approved
///   4000 0000 0000 0002 -> declined      (HTTP 402 PAYMENT_DECLINED)
///   4000 0000 0000 0069 -> gateway timeout (HTTP 504 PAYMENT_TIMEOUT)
///   any other card      -> declined as unsupported test card
///   Cash on delivery    -> payment stays Pending until the order is Delivered
/// </summary>
public static class PaymentSimulator
{
    public const string ApprovedCard = "4111111111111111";
    public const string DeclinedCard = "4000000000000002";
    public const string TimeoutCard = "4000000000000069";

    public static PaymentResult Process(PaymentMethod method, CardInfo? card)
    {
        if (method == PaymentMethod.CashOnDelivery)
            return new(PaymentStatus.Pending, null, null);

        var digits = new string((card?.CardNumber ?? "").Where(char.IsDigit).ToArray());
        var last4 = digits.Length >= 4 ? digits[^4..] : null;
        var reference = "SIM-" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();

        return digits switch
        {
            ApprovedCard => new(PaymentStatus.Paid, reference, last4),
            DeclinedCard => new(PaymentStatus.Failed, null, last4, 402, "PAYMENT_DECLINED", "Your card was declined."),
            TimeoutCard => new(PaymentStatus.Failed, null, last4, 504, "PAYMENT_TIMEOUT",
                "The payment gateway timed out. You have not been charged. Please try again."),
            _ => new(PaymentStatus.Failed, null, last4, 402, "PAYMENT_DECLINED",
                "This card is not supported in the test environment. Use 4111 1111 1111 1111."),
        };
    }
}
