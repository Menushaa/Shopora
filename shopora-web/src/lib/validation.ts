import { z } from 'zod';

// These rules mirror the API's validators. The API always re-checks everything.
const EMAIL_RX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'letter', label: 'One letter', test: (p: string) => /[A-Za-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'One special character (such as ! @ # $)', test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
] as const;

const email = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(256, 'Email must be at most 256 characters.')
  .refine((v) => v === '' || (EMAIL_RX.test(v) && !v.includes('..')), 'Enter a valid email address.');

const newPassword = z
  .string()
  .min(1, 'Password is required.')
  .max(100, 'Password must be at most 100 characters.')
  .superRefine((p, ctx) => {
    if (p.length === 0) return;
    const failed = passwordRules.find((r) => !r.test(p));
    if (failed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password needs at least 8 characters, a letter, a number and a special character.',
      });
    }
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean(),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required.').min(2, 'Full name must be at least 2 characters.').max(100, 'Full name must be at most 100 characters.'),
    address: z.string().trim().min(1, 'Address is required.').max(250, 'Address must be at most 250 characters.'),
    email,
    password: newPassword,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
export type RegisterForm = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email });
export type ForgotForm = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    token: z.string().trim().min(1, 'Reset token is required.'),
    newPassword,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
export type ResetForm = z.infer<typeof resetSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100, 'Name must be at most 100 characters.'),
  email,
  message: z.string().trim().min(10, 'Message must be at least 10 characters.').max(1000, 'Message must be at most 1000 characters.'),
});
export type ContactForm = z.infer<typeof contactSchema>;

// ---------- Phase 4: addresses, profile, password change, checkout ----------
const POSTAL_RX = /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/;
const PHONE_RX = /^\+?[0-9][0-9 -]{6,18}$/;

export const addressSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.').max(30, 'Label must be at most 30 characters.'),
  fullName: z.string().trim().min(1, 'Full name is required.').max(100, 'Full name must be at most 100 characters.'),
  line1: z.string().trim().min(1, 'Address line 1 is required.').max(150, 'Address line 1 must be at most 150 characters.'),
  line2: z.string().trim().max(150, 'Address line 2 must be at most 150 characters.'),
  city: z.string().trim().min(1, 'City is required.').max(80, 'City must be at most 80 characters.'),
  postalCode: z.string().trim().min(1, 'Postal code is required.').refine((v) => v === '' || POSTAL_RX.test(v), 'Enter a valid postal code (3-10 letters or digits).'),
  phone: z.string().trim().min(1, 'Phone number is required.').refine((v) => v === '' || PHONE_RX.test(v), 'Enter a valid phone number (7-20 digits).'),
});
export type AddressForm = z.infer<typeof addressSchema>;
export const emptyAddress: AddressForm = { label: 'Home', fullName: '', line1: '', line2: '', city: '', postalCode: '', phone: '' };

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.').min(2, 'Full name must be at least 2 characters.').max(100, 'Full name must be at most 100 characters.'),
  address: z.string().trim().min(1, 'Address is required.').max(250, 'Address must be at most 250 characters.'),
});
export type ProfileForm = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword,
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' })
  .refine((d) => d.newPassword === '' || d.newPassword !== d.currentPassword, { path: ['newPassword'], message: 'New password must be different from the current password.' });
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

const cardSchema = z
  .object({
    cardNumber: z.string(), holderName: z.string(), expiryMonth: z.string(), expiryYear: z.string(), cvv: z.string(),
  })
  .superRefine((c, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    const digits = c.cardNumber.replace(/[\s-]/g, '');
    if (c.cardNumber.trim() === '') add('cardNumber', 'Card number is required.');
    else if (!/^\d+$/.test(digits)) add('cardNumber', 'Card number may contain digits only.');
    else if (digits.length < 13 || digits.length > 19) add('cardNumber', 'Card number must have 13 to 19 digits.');

    if (c.holderName.trim() === '') add('holderName', 'Card holder name is required.');

    const month = Number(c.expiryMonth);
    const year = Number(c.expiryYear);
    const monthOk = c.expiryMonth.trim() !== '' && Number.isInteger(month) && month >= 1 && month <= 12;
    const yearOk = c.expiryYear.trim() !== '' && Number.isInteger(year) && year >= 2000 && year <= 2100;
    if (c.expiryMonth.trim() === '') add('expiryMonth', 'Expiry month is required.');
    else if (!monthOk) add('expiryMonth', 'Expiry month must be between 1 and 12.');
    if (c.expiryYear.trim() === '') add('expiryYear', 'Expiry year is required.');
    else if (!yearOk) add('expiryYear', 'Enter a four-digit expiry year.');
    if (monthOk && yearOk && new Date(year, month, 1) <= new Date()) add('expiryMonth', 'This card has expired.');

    if (c.cvv.trim() === '') add('cvv', 'CVV is required.');
    else if (!/^\d{3,4}$/.test(c.cvv.trim())) add('cvv', 'CVV must be 3 or 4 digits.');
  });

/** Checkout form: the address section is checked only for a new address, the card section only for card payments. */
export const checkoutSchema = z
  .object({
    addressChoice: z.string(), // a saved address id, or "new"
    saveAddress: z.boolean(),
    newAddress: z.object({ label: z.string(), fullName: z.string(), line1: z.string(), line2: z.string(), city: z.string(), postalCode: z.string(), phone: z.string() }),
    paymentMethod: z.enum(['Card', 'CashOnDelivery']),
    card: z.object({ cardNumber: z.string(), holderName: z.string(), expiryMonth: z.string(), expiryYear: z.string(), cvv: z.string() }),
  })
  .superRefine((v, ctx) => {
    if (!v.addressChoice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['addressChoice'], message: 'Select a delivery address.' });
    }
    if (v.addressChoice === 'new') {
      const r = addressSchema.safeParse(v.newAddress);
      if (!r.success) r.error.issues.forEach((i) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newAddress', ...i.path], message: i.message }));
    }
    if (v.paymentMethod === 'Card') {
      const r = cardSchema.safeParse(v.card);
      if (!r.success) r.error.issues.forEach((i) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['card', ...i.path], message: i.message }));
    }
  });
export type CheckoutForm = z.infer<typeof checkoutSchema>;

// ---------- Phase 5: admin forms ----------
export const productSchema = z
  .object({
    name: z.string().trim().min(1, 'Product name is required.').min(3, 'Product name must be at least 3 characters.').max(150, 'Product name must be at most 150 characters.'),
    sku: z.string().trim().refine((v) => v === '' || /^[A-Za-z0-9_-]{2,40}$/.test(v), "SKU must be 2-40 letters, digits, '-' or '_'."),
    description: z.string().trim().max(2000, 'Description must be at most 2000 characters.'),
    price: z.string().trim().min(1, 'Price is required.'),
    discountPercent: z.string().trim(),
    categoryId: z.string().min(1, 'Select a category.'),
    imageUrl: z.string().trim().max(500, 'Image URL must be at most 500 characters.')
      .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\/\S+$/i.test(v), 'Image URL must start with http:// or https://.'),
    stock: z.string().trim().min(1, 'Stock is required.'),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (v.price !== '') {
      if (!/^-?\d+(\.\d+)?$/.test(v.price)) add('price', 'Price must be a number.');
      else if (Number(v.price) <= 0) add('price', 'Price must be greater than 0.');
      else if (!/^\d+(\.\d{1,2})?$/.test(v.price)) add('price', 'Price may have at most 2 decimal places.');
      else if (Number(v.price) > 99999999.99) add('price', 'Price is too large.');
    }
    if (v.discountPercent !== '') {
      if (!/^-?\d+(\.\d+)?$/.test(v.discountPercent)) add('discountPercent', 'Discount must be a number.');
      else if (Number(v.discountPercent) < 0 || Number(v.discountPercent) > 100) add('discountPercent', 'Discount must be between 0 and 100.');
      else if (!/^\d+(\.\d{1,2})?$/.test(v.discountPercent)) add('discountPercent', 'Discount may have at most 2 decimal places.');
    }
    if (v.stock !== '' && (!/^\d+$/.test(v.stock) || Number(v.stock) > 1_000_000)) {
      add('stock', 'Stock must be a whole number between 0 and 1,000,000.');
    }
  });
export type ProductFormValues = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').min(2, 'Category name must be at least 2 characters.').max(80, 'Category name must be at most 80 characters.'),
  description: z.string().trim().max(500, 'Description must be at most 500 characters.'),
  isActive: z.boolean(),
});
export type CategoryFormValues = z.infer<typeof categorySchema>;

/** Returns an error message, or null when the text is a valid stock quantity. */
export function stockError(text: string): string | null {
  const t = text.trim();
  if (t === '') return 'Enter a stock quantity.';
  if (!/^\d+$/.test(t) || Number(t) > 1_000_000) return 'Stock must be a whole number between 0 and 1,000,000.';
  return null;
}
