// These types mirror the DTOs returned by the Shopora API (camelCase JSON).
export type Role = 'Admin' | 'Customer';

export interface User { id: number; fullName: string; address: string; email: string; role: Role; isActive: boolean }
export interface LoginResponse { user: User; expiresAt: string; token?: string | null }

export interface Category { id: number; name: string; description: string | null; isActive: boolean; productCount: number }

export interface Product {
  id: number; sku: string; name: string; description: string | null;
  price: number; discountPercent: number; finalPrice: number;
  categoryId: number; categoryName: string; imageUrl: string | null;
  stock: number; isActive: boolean; inStock: boolean; isFeatured: boolean;
  createdAt: string; updatedAt: string;
}

export interface Paged<T> { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number }

export interface ProductQuery {
  search?: string; categoryId?: number; minPrice?: number; maxPrice?: number;
  sort?: SortOption; page?: number; pageSize?: number;
}
export type SortOption = 'newest' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';

export interface CartItem {
  id: number; productId: number; name: string; imageUrl: string | null; unitPrice: number; discountPercent: number;
  finalPrice: number; quantity: number; lineTotal: number; stock: number; isAvailable: boolean;
}
export interface Cart { items: CartItem[]; subtotal: number; discountTotal: number; total: number; itemCount: number }

export interface WishlistItem { id: number; product: Product; isAvailable: boolean; addedAt: string }

export interface RegisterInput { fullName: string; address: string; email: string; password: string; confirmPassword: string }
export interface ContactInput { name: string; email: string; message: string }

// ---------- Phase 4: addresses, orders, dashboard ----------
export interface Address {
  id: number; label: string; fullName: string; line1: string; line2: string | null;
  city: string; postalCode: string; phone: string; isDefault: boolean;
}
export interface AddressInput {
  label: string; fullName: string; line1: string; line2?: string | null;
  city: string; postalCode: string; phone: string; isDefault?: boolean;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';
export type PaymentMethod = 'Card' | 'CashOnDelivery';

export interface ShippingAddress { fullName: string; line1: string; line2: string | null; city: string; postalCode: string; phone: string }
export interface OrderItem {
  id: number; productId: number; productName: string; sku: string; unitPrice: number;
  discountPercent: number; finalUnitPrice: number; quantity: number; lineTotal: number;
}
export interface Order {
  id: number; orderNumber: string; status: OrderStatus; paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null; paymentReference: string | null;
  subtotal: number; discountTotal: number; total: number; createdAt: string; updatedAt: string;
  shippingAddress: ShippingAddress; items: OrderItem[]; canCancel: boolean; customerName: string; customerEmail: string;
}

export interface CardInput { cardNumber: string; holderName: string; expiryMonth: number; expiryYear: number; cvv: string }
export interface CheckoutInput {
  addressId?: number; newAddress?: AddressInput; paymentMethod: PaymentMethod; card?: CardInput; idempotencyKey: string;
}

export interface CustomerDashboard {
  fullName: string; totalOrders: number; pendingOrders: number; totalSpent: number;
  wishlistCount: number; cartItemCount: number; recentOrders: Order[]; featured: Product[];
}
export interface ChangePasswordInput { currentPassword: string; newPassword: string; confirmPassword: string }

// ---------- Phase 5: admin ----------
export interface AdminUser {
  id: number; fullName: string; email: string; address: string; isActive: boolean; createdAt: string;
  orderCount: number; totalSpent: number; recentOrders: Order[] | null;
}
export interface DashboardSummary {
  totalProducts: number; activeProducts: number; lowStockProducts: number; outOfStockProducts: number;
  totalCustomers: number; totalOrders: number; pendingOrders: number; completedOrders: number;
  totalSales: number; recentOrders: Order[];
}
export interface InventoryReport { lowStockThreshold: number; totalProducts: number; lowStock: Product[]; outOfStock: Product[] }
export interface DailySales { date: string; orders: number; sales: number }
export interface TopProduct { productName: string; sku: string; unitsSold: number; revenue: number }
export interface SalesReport {
  from: string; to: string; totalSales: number; orderCount: number; itemsSold: number;
  daily: DailySales[]; topProducts: TopProduct[];
}
export interface ProductInput {
  name: string; description?: string | null; sku?: string | null; price: number; discountPercent: number;
  categoryId: number; imageUrl?: string | null; stock: number; isActive: boolean; isFeatured: boolean;
}
export interface CategoryInput { name: string; description?: string | null; isActive: boolean }
export interface AdminProductQuery extends ProductQuery { status?: 'all' | 'active' | 'inactive'; stock?: 'all' | 'low' | 'out' }
export interface AdminUserQuery { search?: string; isActive?: boolean; page?: number; pageSize?: number }
export interface AdminOrderQuery { search?: string; status?: OrderStatus; from?: string; to?: string; page?: number; pageSize?: number }
