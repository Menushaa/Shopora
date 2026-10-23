/* Clears all business data (keeps schema + roles). Dev/Test databases ONLY.
   The API's POST /api/v1/test/reset does this AND re-seeds the known data set. */
IF DB_NAME() NOT LIKE '%Test%' AND DB_NAME() NOT LIKE '%Dev%'
    THROW 50000, 'Refusing to reset: database name must contain Test or Dev.', 1;

DELETE dbo.Payments;      DELETE dbo.OrderItems;  DELETE dbo.Orders;
DELETE dbo.CartItems;     DELETE dbo.Carts;
DELETE dbo.WishlistItems; DELETE dbo.Wishlists;
DELETE dbo.PasswordResetTokens; DELETE dbo.ContactMessages;
DELETE dbo.Addresses;     DELETE dbo.UserRoles;   DELETE dbo.Users;
DELETE dbo.Products;      DELETE dbo.Categories;
