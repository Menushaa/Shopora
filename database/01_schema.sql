/* =====================================================================
   Shopora - SQL Server schema (run once on an empty database)
   Usage:  CREATE DATABASE ShoporaDev;  then run this script on it.
   Seed data (users, categories, products) is inserted by the API seeder
   so BCrypt password hashes are generated, never hard-coded.
   ===================================================================== */
SET NOCOUNT ON;
GO

CREATE TABLE dbo.Roles (
    Id   INT IDENTITY(1,1) CONSTRAINT PK_Roles PRIMARY KEY,
    Name NVARCHAR(30) NOT NULL CONSTRAINT UQ_Roles_Name UNIQUE
);

CREATE TABLE dbo.Users (
    Id               INT IDENTITY(1,1) CONSTRAINT PK_Users PRIMARY KEY,
    FullName         NVARCHAR(100) NOT NULL,
    Address          NVARCHAR(250) NOT NULL,
    Email            NVARCHAR(256) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
    PasswordHash     NVARCHAR(100) NOT NULL,
    IsActive         BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    FailedLoginCount INT NOT NULL CONSTRAINT DF_Users_Failed DEFAULT 0,
    LockoutEnd       DATETIME2 NULL,
    CreatedAt        DATETIME2 NOT NULL CONSTRAINT DF_Users_Created DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2 NOT NULL CONSTRAINT DF_Users_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_FullName CHECK (LEN(LTRIM(RTRIM(FullName))) > 0)
);

CREATE TABLE dbo.UserRoles (
    UserId INT NOT NULL CONSTRAINT FK_UserRoles_Users REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    RoleId INT NOT NULL CONSTRAINT FK_UserRoles_Roles REFERENCES dbo.Roles(Id) ON DELETE CASCADE,
    CONSTRAINT PK_UserRoles PRIMARY KEY (UserId, RoleId)
);

CREATE TABLE dbo.Addresses (
    Id         INT IDENTITY(1,1) CONSTRAINT PK_Addresses PRIMARY KEY,
    UserId     INT NOT NULL CONSTRAINT FK_Addresses_Users REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    Label      NVARCHAR(30)  NOT NULL CONSTRAINT DF_Addr_Label DEFAULT 'Home',
    FullName   NVARCHAR(100) NOT NULL,
    Line1      NVARCHAR(150) NOT NULL,
    Line2      NVARCHAR(150) NULL,
    City       NVARCHAR(80)  NOT NULL,
    PostalCode NVARCHAR(12)  NOT NULL,
    Phone      NVARCHAR(20)  NOT NULL,
    IsDefault  BIT NOT NULL CONSTRAINT DF_Addr_Default DEFAULT 0
);
CREATE UNIQUE INDEX UX_Addresses_OneDefault ON dbo.Addresses(UserId) WHERE IsDefault = 1;

CREATE TABLE dbo.Categories (
    Id          INT IDENTITY(1,1) CONSTRAINT PK_Categories PRIMARY KEY,
    Name        NVARCHAR(80)  NOT NULL CONSTRAINT UQ_Categories_Name UNIQUE,
    Description NVARCHAR(500) NULL,
    IsActive    BIT NOT NULL CONSTRAINT DF_Cat_Active DEFAULT 1
);

CREATE TABLE dbo.Products (
    Id              INT IDENTITY(1,1) CONSTRAINT PK_Products PRIMARY KEY,
    Sku             NVARCHAR(40)   NOT NULL CONSTRAINT UQ_Products_Sku UNIQUE,
    Name            NVARCHAR(150)  NOT NULL,
    Description     NVARCHAR(2000) NULL,
    Price           DECIMAL(18,2)  NOT NULL,
    DiscountPercent DECIMAL(5,2)   NOT NULL CONSTRAINT DF_Prod_Disc DEFAULT 0,
    CategoryId      INT NOT NULL CONSTRAINT FK_Products_Categories REFERENCES dbo.Categories(Id),
    ImageUrl        NVARCHAR(500) NULL,
    Stock           INT NOT NULL CONSTRAINT DF_Prod_Stock DEFAULT 0,
    IsActive        BIT NOT NULL CONSTRAINT DF_Prod_Active DEFAULT 1,
    IsFeatured      BIT NOT NULL CONSTRAINT DF_Prod_Featured DEFAULT 0,
    CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Prod_Created DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Prod_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Products_Price CHECK (Price > 0),
    CONSTRAINT CK_Products_Discount CHECK (DiscountPercent BETWEEN 0 AND 100),
    CONSTRAINT CK_Products_Stock CHECK (Stock >= 0),
    CONSTRAINT CK_Products_Name CHECK (LEN(LTRIM(RTRIM(Name))) >= 3)
);
CREATE INDEX IX_Products_Category ON dbo.Products(CategoryId);
CREATE INDEX IX_Products_Name ON dbo.Products(Name);

CREATE TABLE dbo.Carts (
    Id        INT IDENTITY(1,1) CONSTRAINT PK_Carts PRIMARY KEY,
    UserId    INT NOT NULL CONSTRAINT UQ_Carts_User UNIQUE
              CONSTRAINT FK_Carts_Users REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Cart_Updated DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.CartItems (
    Id        INT IDENTITY(1,1) CONSTRAINT PK_CartItems PRIMARY KEY,
    CartId    INT NOT NULL CONSTRAINT FK_CartItems_Carts REFERENCES dbo.Carts(Id) ON DELETE CASCADE,
    ProductId INT NOT NULL CONSTRAINT FK_CartItems_Products REFERENCES dbo.Products(Id),
    Quantity  INT NOT NULL,
    AddedAt   DATETIME2 NOT NULL CONSTRAINT DF_CartItems_Added DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_CartItems_Cart_Product UNIQUE (CartId, ProductId),
    CONSTRAINT CK_CartItems_Qty CHECK (Quantity > 0)
);

CREATE TABLE dbo.Wishlists (
    Id     INT IDENTITY(1,1) CONSTRAINT PK_Wishlists PRIMARY KEY,
    UserId INT NOT NULL CONSTRAINT UQ_Wishlists_User UNIQUE
           CONSTRAINT FK_Wishlists_Users REFERENCES dbo.Users(Id) ON DELETE CASCADE
);

CREATE TABLE dbo.WishlistItems (
    Id         INT IDENTITY(1,1) CONSTRAINT PK_WishlistItems PRIMARY KEY,
    WishlistId INT NOT NULL CONSTRAINT FK_WishItems_Wishlists REFERENCES dbo.Wishlists(Id) ON DELETE CASCADE,
    ProductId  INT NOT NULL CONSTRAINT FK_WishItems_Products REFERENCES dbo.Products(Id),
    AddedAt    DATETIME2 NOT NULL CONSTRAINT DF_WishItems_Added DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_WishItems_List_Product UNIQUE (WishlistId, ProductId)
);

CREATE TABLE dbo.Orders (
    Id             INT IDENTITY(1,1) CONSTRAINT PK_Orders PRIMARY KEY,
    OrderNumber    NVARCHAR(30) NOT NULL CONSTRAINT UQ_Orders_Number UNIQUE,
    UserId         INT NOT NULL CONSTRAINT FK_Orders_Users REFERENCES dbo.Users(Id),
    Status         NVARCHAR(20) NOT NULL CONSTRAINT DF_Orders_Status DEFAULT 'Pending',
    Subtotal       DECIMAL(18,2) NOT NULL,
    DiscountTotal  DECIMAL(18,2) NOT NULL CONSTRAINT DF_Orders_Disc DEFAULT 0,
    Total          DECIMAL(18,2) NOT NULL,
    -- delivery address snapshot (not a FK: later address edits must not change old orders)
    ShipFullName   NVARCHAR(100) NOT NULL,
    ShipLine1      NVARCHAR(150) NOT NULL,
    ShipLine2      NVARCHAR(150) NULL,
    ShipCity       NVARCHAR(80)  NOT NULL,
    ShipPostalCode NVARCHAR(12)  NOT NULL,
    ShipPhone      NVARCHAR(20)  NOT NULL,
    IdempotencyKey NVARCHAR(64) NULL,
    CreatedAt      DATETIME2 NOT NULL CONSTRAINT DF_Orders_Created DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2 NOT NULL CONSTRAINT DF_Orders_Updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Orders_Status CHECK (Status IN ('Pending','Confirmed','Processing','Shipped','Delivered','Cancelled')),
    CONSTRAINT CK_Orders_Amounts CHECK (Subtotal >= 0 AND DiscountTotal >= 0 AND Total >= 0)
);
CREATE INDEX IX_Orders_User ON dbo.Orders(UserId, CreatedAt DESC);
-- prevents duplicate orders from a double-submit
CREATE UNIQUE INDEX UX_Orders_Idempotency ON dbo.Orders(UserId, IdempotencyKey) WHERE IdempotencyKey IS NOT NULL;

CREATE TABLE dbo.OrderItems (
    Id              INT IDENTITY(1,1) CONSTRAINT PK_OrderItems PRIMARY KEY,
    OrderId         INT NOT NULL CONSTRAINT FK_OrderItems_Orders REFERENCES dbo.Orders(Id) ON DELETE CASCADE,
    ProductId       INT NOT NULL CONSTRAINT FK_OrderItems_Products REFERENCES dbo.Products(Id),
    ProductName     NVARCHAR(150) NOT NULL,   -- snapshot
    Sku             NVARCHAR(40)  NOT NULL,   -- snapshot
    UnitPrice       DECIMAL(18,2) NOT NULL,   -- snapshot (before discount)
    DiscountPercent DECIMAL(5,2)  NOT NULL,   -- snapshot
    Quantity        INT NOT NULL,
    LineTotal       DECIMAL(18,2) NOT NULL,   -- after discount
    CONSTRAINT CK_OrderItems_Qty CHECK (Quantity > 0),
    CONSTRAINT CK_OrderItems_Price CHECK (UnitPrice > 0 AND LineTotal >= 0)
);

CREATE TABLE dbo.Payments (
    Id             INT IDENTITY(1,1) CONSTRAINT PK_Payments PRIMARY KEY,
    OrderId        INT NOT NULL CONSTRAINT UQ_Payments_Order UNIQUE
                   CONSTRAINT FK_Payments_Orders REFERENCES dbo.Orders(Id) ON DELETE CASCADE,
    Method         NVARCHAR(20) NOT NULL,
    Status         NVARCHAR(20) NOT NULL,
    Amount         DECIMAL(18,2) NOT NULL,
    TransactionRef NVARCHAR(40) NULL,
    CardLast4      CHAR(4) NULL,               -- never store full card numbers
    FailureReason  NVARCHAR(200) NULL,
    CreatedAt      DATETIME2 NOT NULL CONSTRAINT DF_Pay_Created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Payments_Method CHECK (Method IN ('Card','CashOnDelivery')),
    CONSTRAINT CK_Payments_Status CHECK (Status IN ('Pending','Paid','Failed','Refunded')),
    CONSTRAINT CK_Payments_Amount CHECK (Amount >= 0)
);

CREATE TABLE dbo.PasswordResetTokens (
    Id        INT IDENTITY(1,1) CONSTRAINT PK_PwdReset PRIMARY KEY,
    UserId    INT NOT NULL CONSTRAINT FK_PwdReset_Users REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    TokenHash NVARCHAR(100) NOT NULL,         -- SHA-256 of the token, never the token itself
    ExpiresAt DATETIME2 NOT NULL,
    UsedAt    DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PwdReset_Created DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_PwdReset_Hash ON dbo.PasswordResetTokens(TokenHash);

CREATE TABLE dbo.ContactMessages (
    Id        INT IDENTITY(1,1) CONSTRAINT PK_Contact PRIMARY KEY,
    Name      NVARCHAR(100)  NOT NULL,
    Email     NVARCHAR(256)  NOT NULL,
    Message   NVARCHAR(1000) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Contact_Created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Contact_Message CHECK (LEN(Message) >= 10)
);

INSERT dbo.Roles(Name) VALUES ('Admin'), ('Customer');
GO
