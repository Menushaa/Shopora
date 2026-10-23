namespace Shopora.Api.Services;

public class ProfileService(ShoporaDbContext db, CatalogService catalog)
{
    private const int MaxAddresses = 10;

    public async Task<UserDto> UpdateAsync(int userId, UpdateProfileRequest r)
    {
        var user = await db.Users.Include(u => u.UserRoles).ThenInclude(x => x.Role).SingleAsync(u => u.Id == userId);
        user.FullName = r.FullName.Trim();
        user.Address = r.Address.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return user.ToDto();
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest r)
    {
        var user = await db.Users.SingleAsync(u => u.Id == userId);
        if (!BCrypt.Net.BCrypt.Verify(r.CurrentPassword, user.PasswordHash))
            throw ApiException.Validation("currentPassword", "Current password is incorrect.");
        if (r.NewPassword == r.CurrentPassword)
            throw ApiException.Validation("newPassword", "New password must be different from the current password.");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.NewPassword, 11);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    // ---------- addresses ----------
    public async Task<List<AddressDto>> ListAddressesAsync(int userId) =>
        (await db.Addresses.AsNoTracking().Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault).ThenBy(a => a.Id).ToListAsync()).Select(a => a.ToDto()).ToList();

    public async Task<AddressDto> AddAddressAsync(int userId, AddressRequest r)
    {
        var count = await db.Addresses.CountAsync(a => a.UserId == userId);
        if (count >= MaxAddresses)
            throw ApiException.Conflict("ADDRESS_LIMIT", $"You can save up to {MaxAddresses} addresses.");

        var makeDefault = r.IsDefault || count == 0;
        await using var tx = await db.Database.BeginTransactionAsync();
        if (makeDefault) await ClearDefaultAsync(userId);
        var address = new Address { UserId = userId, IsDefault = makeDefault };
        Apply(address, r);
        db.Addresses.Add(address);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return address.ToDto();
    }

    public async Task<AddressDto> UpdateAddressAsync(int userId, int id, AddressRequest r)
    {
        var address = await FindAddressAsync(userId, id);
        await using var tx = await db.Database.BeginTransactionAsync();
        if (r.IsDefault && !address.IsDefault) { await ClearDefaultAsync(userId); address.IsDefault = true; }
        Apply(address, r);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return address.ToDto();
    }

    public async Task<AddressDto> SetDefaultAsync(int userId, int id)
    {
        var address = await FindAddressAsync(userId, id);
        if (!address.IsDefault)
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            await ClearDefaultAsync(userId);
            address.IsDefault = true;
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        return address.ToDto();
    }

    public async Task DeleteAddressAsync(int userId, int id)
    {
        var address = await FindAddressAsync(userId, id);
        var others = await db.Addresses.CountAsync(a => a.UserId == userId && a.Id != id);
        if (address.IsDefault && others > 0)
            throw ApiException.Conflict("DEFAULT_ADDRESS", "Choose another default address before deleting this one.");
        db.Addresses.Remove(address);
        await db.SaveChangesAsync();
    }

    private async Task<Address> FindAddressAsync(int userId, int id) =>
        await db.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId)
        ?? throw ApiException.NotFound("Address not found.");

    private Task ClearDefaultAsync(int userId) =>
        db.Addresses.Where(a => a.UserId == userId && a.IsDefault).ExecuteUpdateAsync(s => s.SetProperty(a => a.IsDefault, false));

    private static void Apply(Address a, AddressRequest r)
    {
        a.Label = r.Label.Trim();
        a.FullName = r.FullName.Trim();
        a.Line1 = r.Line1.Trim();
        a.Line2 = string.IsNullOrWhiteSpace(r.Line2) ? null : r.Line2.Trim();
        a.City = r.City.Trim();
        a.PostalCode = r.PostalCode.Trim();
        a.Phone = r.Phone.Trim();
    }

    // ---------- dashboard ----------
    public async Task<CustomerDashboardDto> DashboardAsync(int userId)
    {
        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId);
        var orders = db.Orders.AsNoTracking().Where(o => o.UserId == userId);
        var recent = await db.Orders.AsNoTracking().Include(o => o.Items).Include(o => o.Payment).Include(o => o.User)
            .Where(o => o.UserId == userId).OrderByDescending(o => o.CreatedAt).Take(3).ToListAsync();

        return new CustomerDashboardDto(
            user.FullName,
            await orders.CountAsync(),
            await orders.CountAsync(o => o.Status == OrderStatus.Pending),
            await orders.Where(o => o.Status == OrderStatus.Delivered).SumAsync(o => (decimal?)o.Total) ?? 0m,
            await db.WishlistItems.CountAsync(i => i.Wishlist.UserId == userId),
            await db.CartItems.Where(i => i.Cart.UserId == userId).SumAsync(i => (int?)i.Quantity) ?? 0,
            recent.Select(o => o.ToDto()).ToList(),
            await catalog.FeaturedAsync(4));
    }
}
