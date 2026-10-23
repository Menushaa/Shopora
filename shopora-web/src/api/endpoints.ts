import { del, get, patch, post, put } from './client';
import type {
  AdminOrderQuery, AdminProductQuery, AdminUser, AdminUserQuery, CategoryInput, DashboardSummary, InventoryReport,
  OrderStatus, ProductInput, SalesReport,
  Address, AddressInput, Cart, Category, ChangePasswordInput, CheckoutInput, ContactInput, CustomerDashboard,
  LoginResponse, Order, Paged, Product, ProductQuery, RegisterInput, User, WishlistItem,
} from './types';

export const authApi = {
  register: (input: RegisterInput) => post<User>('/auth/register', input),
  login: (email: string, password: string, rememberMe: boolean) =>
    post<LoginResponse>('/auth/login', { email, password, rememberMe }),
  logout: () => post<{ message: string }>('/auth/logout'),
  me: () => get<User>('/auth/me'),
  forgotPassword: (email: string) => post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
    post<{ message: string }>('/auth/reset-password', { token, newPassword, confirmPassword }),
};

export const catalogApi = {
  list: (query: ProductQuery) => get<Paged<Product>>('/products', query),
  get: (id: number) => get<Product>(`/products/${id}`),
  featured: () => get<Product[]>('/products/featured'),
  newArrivals: () => get<Product[]>('/products/new-arrivals'),
  offers: () => get<Product[]>('/products/offers'),
  categories: () => get<Category[]>('/categories'),
};

export const cartApi = {
  get: () => get<Cart>('/cart'),
  add: (productId: number, quantity: number) => post<Cart>('/cart/items', { productId, quantity }),
  update: (itemId: number, quantity: number) => put<Cart>(`/cart/items/${itemId}`, { quantity }),
  remove: (itemId: number) => del<Cart>(`/cart/items/${itemId}`),
  clear: () => del<Cart>('/cart'),
};

export const wishlistApi = {
  list: () => get<WishlistItem[]>('/wishlist'),
  add: (productId: number) => post<WishlistItem>('/wishlist/items', { productId }),
  remove: (itemId: number) => del(`/wishlist/items/${itemId}`),
  moveToCart: (itemId: number) => post<Cart>(`/wishlist/items/${itemId}/move-to-cart`),
};

export const ordersApi = {
  checkout: (input: CheckoutInput) => post<Order>('/orders', input),
  list: (page: number, pageSize = 10) => get<Paged<Order>>('/orders', { page, pageSize }),
  get: (id: number) => get<Order>(`/orders/${id}`),
  cancel: (id: number) => post<Order>(`/orders/${id}/cancel`),
};

export const meApi = {
  update: (fullName: string, address: string) => put<User>('/me', { fullName, address }),
  changePassword: (input: ChangePasswordInput) => put<{ message: string }>('/me/password', input),
  dashboard: () => get<CustomerDashboard>('/me/dashboard'),
  addresses: () => get<Address[]>('/me/addresses'),
  addAddress: (input: AddressInput) => post<Address>('/me/addresses', input),
  updateAddress: (id: number, input: AddressInput) => put<Address>(`/me/addresses/${id}`, input),
  deleteAddress: (id: number) => del(`/me/addresses/${id}`),
  setDefaultAddress: (id: number) => patch<Address>(`/me/addresses/${id}/default`),
};

export const contactApi = {
  send: (input: ContactInput) => post<{ message: string }>('/contact', input),
};

export const adminApi = {
  dashboard: () => get<DashboardSummary>('/admin/dashboard/summary'),
  inventory: () => get<InventoryReport>('/admin/reports/inventory'),
  sales: (from?: string, to?: string) => get<SalesReport>('/admin/reports/sales', { from, to }),

  products: (q: AdminProductQuery) => get<Paged<Product>>('/admin/products', q),
  product: (id: number) => get<Product>(`/admin/products/${id}`),
  createProduct: (input: ProductInput) => post<Product>('/admin/products', input),
  updateProduct: (id: number, input: ProductInput) => put<Product>(`/admin/products/${id}`, input),
  setProductStatus: (id: number, isActive: boolean) => patch<Product>(`/admin/products/${id}/status`, { isActive }),
  setProductStock: (id: number, stock: number) => patch<Product>(`/admin/products/${id}/stock`, { stock }),

  categories: () => get<Category[]>('/admin/categories'),
  createCategory: (input: CategoryInput) => post<Category>('/admin/categories', input),
  updateCategory: (id: number, input: CategoryInput) => put<Category>(`/admin/categories/${id}`, input),
  setCategoryStatus: (id: number, isActive: boolean) => patch<Category>(`/admin/categories/${id}/status`, { isActive }),

  users: (q: AdminUserQuery) => get<Paged<AdminUser>>('/admin/users', q),
  user: (id: number) => get<AdminUser>(`/admin/users/${id}`),
  setUserStatus: (id: number, isActive: boolean) => patch<AdminUser>(`/admin/users/${id}/status`, { isActive }),

  orders: (q: AdminOrderQuery) => get<Paged<Order>>('/admin/orders', q),
  order: (id: number) => get<Order>(`/admin/orders/${id}`),
  updateOrderStatus: (id: number, status: OrderStatus) => patch<Order>(`/admin/orders/${id}/status`, { status }),
};
