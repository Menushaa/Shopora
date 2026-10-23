using System.Text.RegularExpressions;
using FluentValidation;

namespace Shopora.Api.Validators;

/// <summary>Shared validation building blocks (used by the API; the React app mirrors them with Zod).</summary>
public static class Rules
{
    private static readonly Regex EmailRx = new(
        @"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$", RegexOptions.Compiled);

    public static bool IsEmail(string? email)
    {
        var e = email?.Trim();
        return !string.IsNullOrEmpty(e) && e.Length <= 256 && !e.Contains("..") && EmailRx.IsMatch(e);
    }

    public static IRuleBuilderOptions<T, string> Required<T>(this IRuleBuilder<T, string> rb, string label) =>
        rb.Must(s => !string.IsNullOrWhiteSpace(s)).WithMessage($"{label} is required.");

    public static IRuleBuilderOptions<T, string> ValidEmail<T>(this IRuleBuilder<T, string> rb) =>
        rb.Required("Email").Must(IsEmail).WithMessage("Enter a valid email address.");

    public static IRuleBuilderOptions<T, string> MaxTrimmed<T>(this IRuleBuilder<T, string> rb, int max, string label) =>
        rb.Must(s => (s?.Trim().Length ?? 0) <= max).WithMessage($"{label} must be at most {max} characters.");

    /// <summary>At least 8 characters with a letter, a number and a special character.</summary>
    public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilder<T, string> rb) =>
        rb.Required("Password")
          .Must(p => p.Length >= 8).WithMessage("Password must be at least 8 characters.")
          .Must(p => p.Length <= 100).WithMessage("Password must be at most 100 characters.")
          .Must(p => p.Any(char.IsLetter)).WithMessage("Password must contain at least one letter.")
          .Must(p => p.Any(char.IsDigit)).WithMessage("Password must contain at least one number.")
          .Must(p => p.Any(c => !char.IsLetterOrDigit(c) && !char.IsWhiteSpace(c)))
          .WithMessage("Password must contain at least one special character.");
}
