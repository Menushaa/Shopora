using FluentValidation;

namespace Shopora.Api.Validators;

public class AddCartItemValidator : AbstractValidator<AddCartItemRequest>
{
    public AddCartItemValidator()
    {
        RuleFor(x => x.ProductId).Cascade(CascadeMode.Stop).NotNull().WithMessage("Product is required.")
            .GreaterThan(0).WithMessage("Product is invalid.");
        RuleFor(x => x.Quantity).Cascade(CascadeMode.Stop).NotNull().WithMessage("Quantity is required.")
            .InclusiveBetween(1, 10000).WithMessage("Quantity must be a whole number between 1 and 10000.");
    }
}

public class UpdateCartItemValidator : AbstractValidator<UpdateCartItemRequest>
{
    public UpdateCartItemValidator() =>
        RuleFor(x => x.Quantity).Cascade(CascadeMode.Stop).NotNull().WithMessage("Quantity is required.")
            .InclusiveBetween(1, 10000).WithMessage("Quantity must be a whole number between 1 and 10000.");
}

public class AddWishlistItemValidator : AbstractValidator<AddWishlistItemRequest>
{
    public AddWishlistItemValidator() =>
        RuleFor(x => x.ProductId).Cascade(CascadeMode.Stop).NotNull().WithMessage("Product is required.")
            .GreaterThan(0).WithMessage("Product is invalid.");
}

public class CardInfoValidator : AbstractValidator<CardInfo>
{
    public CardInfoValidator()
    {
        RuleFor(x => x.CardNumber).Cascade(CascadeMode.Stop).Required("Card number")
            .Must(n => n.All(c => char.IsDigit(c) || c == ' ' || c == '-')).WithMessage("Card number may contain digits only.")
            .Must(n => { var d = n.Count(char.IsDigit); return d is >= 13 and <= 19; })
            .WithMessage("Card number must have 13 to 19 digits.");
        RuleFor(x => x.HolderName).Cascade(CascadeMode.Stop).Required("Card holder name").MaxTrimmed(100, "Card holder name");
        RuleFor(x => x.ExpiryMonth).Cascade(CascadeMode.Stop).NotNull().WithMessage("Expiry month is required.")
            .InclusiveBetween(1, 12).WithMessage("Expiry month must be between 1 and 12.");
        RuleFor(x => x.ExpiryYear).Cascade(CascadeMode.Stop).NotNull().WithMessage("Expiry year is required.")
            .InclusiveBetween(DateTime.UtcNow.Year, DateTime.UtcNow.Year + 20).WithMessage("Expiry year is invalid or the card has expired.");
        RuleFor(x => x).Must(c => new DateTime(c.ExpiryYear!.Value, c.ExpiryMonth!.Value, 1).AddMonths(1) > DateTime.UtcNow)
            .WithMessage("This card has expired.").OverridePropertyName("expiryMonth")
            .When(c => c.ExpiryMonth is >= 1 and <= 12 && c.ExpiryYear is >= 2000 and <= 2100);
        RuleFor(x => x.Cvv).Cascade(CascadeMode.Stop).Required("CVV")
            .Matches(@"^\d{3,4}$").WithMessage("CVV must be 3 or 4 digits.");
    }
}

public class CheckoutValidator : AbstractValidator<CheckoutRequest>
{
    public CheckoutValidator()
    {
        RuleFor(x => x.AddressId).NotNull().WithMessage("Delivery address is required.").When(x => x.NewAddress == null);
        RuleFor(x => x.AddressId).GreaterThan(0).WithMessage("Address is invalid.").When(x => x.AddressId.HasValue);
        RuleFor(x => x.NewAddress!).SetValidator(new AddressValidator()).When(x => x.NewAddress != null && !x.AddressId.HasValue);
        RuleFor(x => x.PaymentMethod).IsInEnum().WithMessage("Payment method is invalid.");
        RuleFor(x => x.Card).NotNull().WithMessage("Card details are required for card payments.")
            .When(x => x.PaymentMethod == PaymentMethod.Card);
        RuleFor(x => x.Card!).SetValidator(new CardInfoValidator()).When(x => x.PaymentMethod == PaymentMethod.Card && x.Card != null);
        RuleFor(x => x.IdempotencyKey).MaximumLength(64).WithMessage("Idempotency key must be at most 64 characters.");
    }
}

public class OrderStatusRequestValidator : AbstractValidator<OrderStatusRequest>
{
    public OrderStatusRequestValidator() =>
        RuleFor(x => x.Status).Cascade(CascadeMode.Stop).NotNull().WithMessage("Status is required.")
            .IsInEnum().WithMessage("Status is invalid.");
}
