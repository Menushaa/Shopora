using System.Text.RegularExpressions;
using FluentValidation;

namespace Shopora.Api.Validators;

public class RegisterValidator : AbstractValidator<RegisterRequest>
{
    public RegisterValidator()
    {
        RuleFor(x => x.FullName).Cascade(CascadeMode.Stop).Required("Full name")
            .Must(s => s.Trim().Length >= 2).WithMessage("Full name must be at least 2 characters.")
            .MaxTrimmed(100, "Full name");
        RuleFor(x => x.Address).Cascade(CascadeMode.Stop).Required("Address").MaxTrimmed(250, "Address");
        RuleFor(x => x.Email).Cascade(CascadeMode.Stop).ValidEmail();
        RuleFor(x => x.Password).Cascade(CascadeMode.Stop).StrongPassword();
        RuleFor(x => x.ConfirmPassword).Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Please confirm your password.")
            .Equal(x => x.Password).WithMessage("Passwords do not match.");
    }
}

public class LoginValidator : AbstractValidator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).Cascade(CascadeMode.Stop).ValidEmail();
        RuleFor(x => x.Password).NotEmpty().WithMessage("Password is required.");
    }
}

public class ForgotPasswordValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordValidator() => RuleFor(x => x.Email).Cascade(CascadeMode.Stop).ValidEmail();
}

public class ResetPasswordValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.Token).Required("Reset token");
        RuleFor(x => x.NewPassword).Cascade(CascadeMode.Stop).StrongPassword();
        RuleFor(x => x.ConfirmPassword).Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Please confirm your password.")
            .Equal(x => x.NewPassword).WithMessage("Passwords do not match.");
    }
}

public class ChangePasswordValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Current password is required.");
        RuleFor(x => x.NewPassword).Cascade(CascadeMode.Stop).StrongPassword();
        RuleFor(x => x.ConfirmPassword).Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Please confirm your new password.")
            .Equal(x => x.NewPassword).WithMessage("Passwords do not match.");
    }
}

public class UpdateProfileValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.FullName).Cascade(CascadeMode.Stop).Required("Full name")
            .Must(s => s.Trim().Length >= 2).WithMessage("Full name must be at least 2 characters.")
            .MaxTrimmed(100, "Full name");
        RuleFor(x => x.Address).Cascade(CascadeMode.Stop).Required("Address").MaxTrimmed(250, "Address");
    }
}

public class AddressValidator : AbstractValidator<AddressRequest>
{
    private static readonly Regex Postal = new(@"^[A-Za-z0-9][A-Za-z0-9 \-]{2,9}$", RegexOptions.Compiled);
    private static readonly Regex Phone = new(@"^\+?[0-9][0-9 \-]{6,18}$", RegexOptions.Compiled);

    public AddressValidator()
    {
        RuleFor(x => x.Label).Cascade(CascadeMode.Stop).Required("Label").MaxTrimmed(30, "Label");
        RuleFor(x => x.FullName).Cascade(CascadeMode.Stop).Required("Full name").MaxTrimmed(100, "Full name");
        RuleFor(x => x.Line1).Cascade(CascadeMode.Stop).Required("Address line 1").MaxTrimmed(150, "Address line 1");
        RuleFor(x => x.Line2).MaximumLength(150).WithMessage("Address line 2 must be at most 150 characters.");
        RuleFor(x => x.City).Cascade(CascadeMode.Stop).Required("City").MaxTrimmed(80, "City");
        RuleFor(x => x.PostalCode).Cascade(CascadeMode.Stop).Required("Postal code")
            .Must(s => Postal.IsMatch(s.Trim())).WithMessage("Enter a valid postal code (3-10 letters or digits).");
        RuleFor(x => x.Phone).Cascade(CascadeMode.Stop).Required("Phone number")
            .Must(s => Phone.IsMatch(s.Trim())).WithMessage("Enter a valid phone number (7-20 digits).");
    }
}

public class ContactValidator : AbstractValidator<ContactRequest>
{
    public ContactValidator()
    {
        RuleFor(x => x.Name).Cascade(CascadeMode.Stop).Required("Name").MaxTrimmed(100, "Name");
        RuleFor(x => x.Email).Cascade(CascadeMode.Stop).ValidEmail();
        RuleFor(x => x.Message).Cascade(CascadeMode.Stop).Required("Message")
            .Must(s => s.Trim().Length >= 10).WithMessage("Message must be at least 10 characters.")
            .Must(s => s.Trim().Length <= 1000).WithMessage("Message must be at most 1000 characters.");
    }
}
