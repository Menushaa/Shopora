import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './routes/ProtectedRoute';
import Home from './pages/public/Home';
import Products from './pages/public/Products';
import ProductDetails from './pages/public/ProductDetails';
import Categories from './pages/public/Categories';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import Faq from './pages/public/Faq';
import Privacy from './pages/public/Privacy';
import Terms from './pages/public/Terms';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';
import ResetPassword from './pages/public/ResetPassword';
import AccessDenied from './pages/public/AccessDenied';
import NotFound from './pages/public/NotFound';
import Dashboard from './pages/customer/Dashboard';
import Cart from './pages/customer/Cart';
import Wishlist from './pages/customer/Wishlist';
import Checkout from './pages/customer/Checkout';
import OrderConfirmation from './pages/customer/OrderConfirmation';
import Orders from './pages/customer/Orders';
import OrderDetails from './pages/customer/OrderDetails';
import Profile from './pages/customer/Profile';
import Addresses from './pages/customer/Addresses';
import ChangePassword from './pages/customer/ChangePassword';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProductsAdmin from './pages/admin/ProductsAdmin';
import ProductForm from './pages/admin/ProductForm';
import CategoriesAdmin from './pages/admin/CategoriesAdmin';
import CustomersAdmin from './pages/admin/CustomersAdmin';
import CustomerDetail from './pages/admin/CustomerDetail';
import OrdersAdmin from './pages/admin/OrdersAdmin';
import OrderDetailAdmin from './pages/admin/OrderDetailAdmin';
import Reports from './pages/admin/Reports';


export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetails />} />
        <Route path="categories" element={<Categories />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<Faq />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="access-denied" element={<AccessDenied />} />

        {/* Customer area (customers only; admins are sent to Access Denied) */}
        <Route element={<ProtectedRoute role="Customer" />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="cart" element={<Cart />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-confirmation/:id" element={<OrderConfirmation />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="profile" element={<Profile />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>

        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin area: its own layout (sidebar), admins only */}
      <Route element={<ProtectedRoute role="Admin" />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<ProductsAdmin />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductForm />} />
          <Route path="categories" element={<CategoriesAdmin />} />
          <Route path="customers" element={<CustomersAdmin />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="orders" element={<OrdersAdmin />} />
          <Route path="orders/:id" element={<OrderDetailAdmin />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<NotFound backTo="/admin" backLabel="Back to the dashboard" />} />
        </Route>
      </Route>
    </Routes>
  );
}
