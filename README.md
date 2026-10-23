# Shopora - Your World of Shopping

Full-stack e-commerce app built for manual, API and Playwright automation testing.
**React (TypeScript) + ASP.NET Core 8 + SQL Server.** Theme: purple and white.

> Build status: **Phase 5 of 7 complete** - database, REST API with Swagger, the React storefront, the customer area and the admin panel.
> Next: Phase 6 (Postman collection and Playwright tests), then Phase 7 (test documentation).

## Repository layout
```
database/       01_schema.sql, 02_reset_test_data.sql
shopora-api/    ASP.NET Core 8 Web API
  Controllers/  public, customer, Admin/, Test
  Services/     business logic (Auth, Cart, Orders/Checkout, Admin, Reports, PaymentSimulator)
  Validators/   FluentValidation rules (server-side, never trusts the browser)
  Dtos/ Models/ Data/ Common/ Middleware/
shopora-web/    React + TypeScript + Vite storefront
shopora-tests/  Playwright + TypeScript   (Phase 6)
postman/        Postman collection        (Phase 6)
docs/branding/  logo.svg
```

## Run it
Prerequisites: .NET 8 SDK, SQL Server (LocalDB / Express / Developer), Git.

```bash
cd shopora-api
dotnet restore
dotnet run --launch-profile Development      # or: --launch-profile Test  (uses ShoporaTest DB + test endpoints)
```
* API addresses: `https://localhost:44359` and `http://localhost:5100` (set in `shopora-api/Properties/launchSettings.json`)
* Swagger UI: `https://localhost:44359/swagger`
* Health check: `https://localhost:44359/health`  -> 40 products, 3 users

The schema is created automatically on first run (EF Core), or run `database/01_schema.sql` on an empty database first.

**Other SQL Server / secrets** - never edit committed files for secrets:
```powershell
$env:ConnectionStrings__Default = "Server=localhost,1433;Database=ShoporaDev;User Id=sa;Password=<pwd>;TrustServerCertificate=True"
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "<at least 32 random characters>"
```
Without `Jwt:Key`, Development/Test generate a temporary key at startup (logins reset on restart). Production refuses to start without it.

## Run the web app (Phase 3)
Prerequisites: Node.js 20+ and the API running (see above, `dotnet run` on port 5100).
```bash
cd shopora-web
npm install
npm run dev          # http://localhost:5173
```
Vite proxies `/api` to `https://localhost:44359` (`secure: false` accepts the local dev certificate), so the HttpOnly login cookie stays same-origin (no CORS setup needed in development).
If the API uses another address (for example a different Visual Studio port), change `API_TARGET` at the top of `shopora-web/vite.config.ts`.
Quick connection test with both running: open `http://localhost:5173/api/v1/products`; you should see JSON.
Other scripts: `npm run typecheck`, `npm run build`, `npm run preview`.

**What works now:** Home (hero, categories, featured, new arrivals, offers), Products (search, category, price range, sort, pagination, URL-synced filters),
Product details (quantity, add to cart, wishlist), Categories, About, Contact (validated form), FAQ, Privacy, Terms, Login (Remember me, forgot link),
Register (live password checklist), Forgot/Reset password, 404 and Access Denied pages, role-based redirects after login
(customers go to `/dashboard`, admins to `/admin`), route protection, cart and wishlist badges, toasts, loading/empty/error states.
**Customer area (Phase 4):** dashboard (stats, recent orders, recently viewed, recommended), cart (quantity stepper, remove, clear with confirmation, unavailable-item warnings),
wishlist (move to cart, remove), checkout (saved or new address, card or cash on delivery, simulated payment, duplicate-submit protection), order confirmation,
order history, order details with progress tracker and cancel, profile, addresses (add, edit, delete, default) and change password.

**Admin panel (Phase 5)** at `/admin` (log in as `admin@shopora.test` / `Admin@12345`; it has its own sidebar layout, separate from the storefront):
dashboard (sales, order, customer and stock numbers, latest orders), products (search, category/status/stock filters, add, edit, activate/deactivate with confirmation,
inline stock editing), categories (add, edit, activate/deactivate with a warning about hidden products), customers (search, status filter, details, deactivate/reactivate),
orders (search, status and date filters, details, allowed status buttons with confirmation for cancel/deliver) and reports (sales by day with top products, low-stock and out-of-stock lists).
Customers who open `/admin` see the Access Denied page.

**Try it:** log in as `customer1@shopora.test` / `Customer@123`, add products to the cart and wishlist from any product card; visit `/admin` as a customer to see Access Denied.

**Automation notes (for Phase 6):** every form field has a visible label (`getByLabel`) and a `data-testid` of `field-<name>`; errors use `role="alert"` with
`data-testid="error-<name>"`; buttons have text names; lists use `data-testid` such as `product-card`, `product-grid`, `results-summary`, `cart-count`, `toast-success`,
`toast-error`; loading states expose `data-testid="loading"`; filters, pagination and sorting live in the URL (`?search=&categoryId=&minPrice=&maxPrice=&sort=&page=`).

## Using Swagger
1. Open `/swagger`, expand **POST /api/v1/auth/login**, click *Try it out*, use a test account below, Execute.
2. The API sets an **HttpOnly cookie**; the browser keeps it, so every other endpoint now works without an Authorize button.
3. Log in as `customer1` for cart/orders, or as `admin` for the `admin/*` endpoints. `POST /auth/logout` ends the session.
4. Postman/scripts: Dev/Test login responses also include `data.token`; send it as `Authorization: Bearer <token>`.

## Test accounts (Development/Test databases only)
| Role | Email | Password |
|---|---|---|
| Admin | admin@shopora.test | Admin@12345 |
| Customer | customer1@shopora.test | Customer@123 |
| Customer | customer2@shopora.test | Customer@123 |

## Response format
```json
{ "success": true,  "data": { }, "error": null }
{ "success": false, "data": null, "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "email": ["Enter a valid email address."] } } }
```
Status codes: 200, 201, 204, 400 validation, 401 not signed in, 403 wrong role, 404 not found (also for other users' data),
409 business-rule conflict, 402 payment declined, 429 rate/lockout, 504 payment timeout, 500 unexpected.

## Endpoints (`/api/v1`)
| Area | Endpoints |
|---|---|
| Auth | `POST auth/register`, `auth/login`, `auth/logout`, `auth/forgot-password`, `auth/reset-password`; `GET auth/me` |
| Profile | `GET/PUT me`, `PUT me/password`, `GET me/dashboard`; `GET/POST me/addresses`, `PUT/DELETE me/addresses/{id}`, `PATCH me/addresses/{id}/default` |
| Catalogue (public) | `GET products` (search, categoryId, minPrice, maxPrice, sort, page, pageSize), `GET products/{id}`, `products/featured`, `products/new-arrivals`, `products/offers`, `GET categories` |
| Cart | `GET cart`, `POST cart/items`, `PUT/DELETE cart/items/{id}`, `DELETE cart` |
| Wishlist | `GET wishlist`, `POST wishlist/items`, `DELETE wishlist/items/{id}`, `POST wishlist/items/{id}/move-to-cart` |
| Orders | `POST orders` (checkout), `GET orders`, `GET orders/{id}`, `POST orders/{id}/cancel` |
| Contact | `POST contact` |
| Admin | `admin/products` (list, get, POST, PUT, `PATCH {id}/status`, `PATCH {id}/stock`, DELETE = deactivate), `admin/categories` (list, POST, PUT, `PATCH {id}/status`), `admin/users` (list, get, `PATCH {id}/status`), `admin/orders` (list, get, `PATCH {id}/status`), `GET admin/dashboard/summary`, `admin/reports/inventory`, `admin/reports/sales` |
| Test only | `POST test/reset`, `POST test/seed`, `GET test/reset-token?email=` (exist only with `--launch-profile Test`) |

## Business rules to test against
* **Passwords**: >= 8 chars with a letter, a number and a special character; BCrypt hashed. Names/emails are trimmed; emails are case-insensitive and unique (409 `EMAIL_EXISTS`).
* **Login**: same 401 message for wrong email or password; 5 failures lock the account 15 minutes (429); deactivated accounts get 403 after a correct password; login is also rate limited per IP (10/min; 1000 in Test).
* **Session**: JWT in an HttpOnly cookie (2 h, or 30 days with Remember Me). Logout revokes the token. Deactivating a customer ends their session immediately.
* **Roles**: customers get 403 on `admin/*`; admins get 403 on cart, wishlist, orders and addresses.
* **Forgot password**: always the same reply; token is single-use, 30 minutes, stored hashed. No email is sent: the token is written to the API log (Dev/Test) and available at `GET test/reset-token` (Test).
* **Catalogue**: only active products in active categories are visible; price filters use the price after discount; page size 1-50; min price > max price is a 400.
* **Cart**: one line per product (quantities merge), quantity 1..stock, out-of-stock/inactive rejected (409), totals always recomputed by the server, other customers' items return 404.
* **Wishlist**: no duplicates (409), inactive products cannot be added, unavailable ones show `isAvailable:false` and cannot be moved to the cart.
* **Checkout**: one SQL transaction: atomic stock reservation, simulated payment, order + items + payment, cart cleared. Any failure rolls everything back. Same `idempotencyKey` returns the original order (200) instead of a duplicate. Delivery address is copied onto the order.
* **Simulated payment**: `4111 1111 1111 1111` approved - `4000 0000 0000 0002` declined (402) - `4000 0000 0000 0069` timeout (504) - any other card declined. Cash on delivery stays Pending until the order is Delivered. A failed payment creates no order.
* **Order status**: Pending -> Confirmed -> Processing -> Shipped -> Delivered. Cancel only from Pending/Confirmed (restocks items, refunds payment). Delivered/Cancelled are final. Invalid moves return 409 `INVALID_STATUS_TRANSITION`.
* **Addresses**: max 10; first one is default; the default can't be deleted while others exist (409).
* **Reports**: sales count Delivered orders only; low stock = 1-5 units, out of stock = 0 (active products).
* **Categories**: names are unique; deactivating one hides its products and blocks buying them; reactivating restores them.

## Test data
Seed: 6 categories, 40 products (LKR), 3 out of stock, 3 low stock, 1 inactive, 13 discounted; customer1 has a Delivered and a Pending order.
`POST /api/v1/test/reset` (Test profile) restores this exact state and restarts IDs at 1. `database/02_reset_test_data.sql` clears data manually (refuses unless the DB name contains Dev/Test).

## Branding
Primary `#6D28D9` - Dark `#4C1D95` - Accent `#A78BFA` - Tint `#F5F3FF`.
