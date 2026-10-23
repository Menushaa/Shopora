# Shopora - Your World of Shopping

Full-stack e-commerce application built for manual, API, and Playwright automation testing.

**Technologies:** React (TypeScript), ASP.NET Core 8, and SQL Server.  
**Theme:** Purple and white.

**Project status:** Phase 5 of 7 complete. The database, REST API with Swagger, React storefront, customer area, and admin panel are implemented. Phase 6 covers Postman and Playwright tests, followed by Phase 7 documentation.

## Repository Layout

```text
shopora/
├── database/       # SQL schema and test-data reset scripts
├── shopora-api/    # ASP.NET Core 8 Web API
├── shopora-web/    # React + TypeScript + Vite frontend
├── shopora-tests/  # Playwright + TypeScript tests (Phase 6)
├── postman/        # Postman collection (Phase 6)
└── docs/branding/  # Branding assets
```

## Prerequisites

- .NET 8 SDK
- SQL Server (LocalDB, Express, or Developer)
- Node.js 20+
- Git

## Run the API

```bash
cd shopora-api
dotnet restore
dotnet run --launch-profile Development
```

The Test launch profile can also be used for the test database and test-only endpoints.

- API: `https://localhost:44359` or `http://localhost:5100`
- Swagger: `https://localhost:44359/swagger`
- Health check: `https://localhost:44359/health`

The database schema is configured to be created automatically on first run, or you can execute `database/01_schema.sql` against an empty database first.

### Configuration and Secrets

Configure the database connection and JWT key through environment variables or .NET User Secrets. Never commit real passwords, keys, or connection-string credentials.

Example PowerShell configuration:

```powershell
$env:ConnectionStrings__Default = "YOUR_DATABASE_CONNECTION_STRING"
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "YOUR_SECURE_RANDOM_KEY"
```

Check the API configuration to confirm the expected connection-string key before running the application.

## Run the Web Application

Start the API first, then open another terminal:

```bash
cd shopora-web
npm install
npm run dev
```

The frontend normally runs at `http://localhost:5173`.

Other useful commands:

```bash
npm run typecheck
npm run build
npm run preview
```

Check `shopora-web/vite.config.ts` if the API uses a different address.

## Implemented Features

### Storefront

- Home page, categories, featured products, new arrivals, and offers
- Product search, filtering, sorting, and pagination
- Product details, cart, and wishlist
- About, Contact, FAQ, Privacy, and Terms pages
- Registration, login, password reset, and route protection
- Loading, empty, error, and notification states

### Customer Area

- Dashboard and order history
- Cart and wishlist management
- Checkout with saved or new addresses
- Simulated card payment and cash on delivery
- Order confirmation, details, cancellation, and status tracking
- Profile, address management, and password changes

### Admin Panel

Available at `/admin` for authorized administrators.

- Dashboard statistics
- Product and category management
- Customer activation and deactivation
- Order management and status updates
- Sales and inventory reports
- Stock editing and low-stock monitoring

## API and Authentication

The API uses the `/api/v1` route prefix and provides endpoints for:

- Authentication and account management
- Customer profiles and addresses
- Products and categories
- Cart and wishlist
- Checkout and orders
- Admin product, category, customer, order, and report operations

Authentication uses an HttpOnly cookie. Development and test configurations also support token-based requests where configured.

Open `/swagger` to explore and test the API endpoints.

## Testing

The project is designed for manual, API, and browser automation testing.

Planned Phase 6 work includes Postman API collections and Playwright end-to-end tests.

## Database and Test Data

The `database` folder contains SQL scripts for database setup and test-data reset.

Use the Development or Test database for testing. Never run test-reset operations against production data.

## Branding

- Primary: `#6D28D9`
- Dark: `#4C1D95`
- Accent: `#A78BFA`
- Tint: `#F5F3FF`
