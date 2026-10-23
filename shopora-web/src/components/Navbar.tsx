import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { useToast } from '../context/ToastContext';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount, wishlistCount } = useShop();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [term, setTerm] = useState('');
  const accountRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'Admin';
  const canShop = !isAdmin; // visitors and customers see cart + wishlist icons

  // Close menus when the page changes or the shopper clicks elsewhere / presses Escape.
  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAccountOpen(false); setMenuOpen(false); } };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
    setMenuOpen(false);
  };

  const signOut = async () => {
    await logout();
    toast.success('You have been logged out');
    navigate('/', { replace: true });
  };

  return (
    <header className="header">
      <div className="container header__bar">
        <Logo />

        <div id="site-menu" className={`header__menu${menuOpen ? ' is-open' : ''}`}>
          <nav aria-label="Main">
            <ul className="nav">
              {LINKS.map((l) => (
                <li key={l.to}><NavLink to={l.to} end={l.end} className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}>{l.label}</NavLink></li>
              ))}
            </ul>
          </nav>
          <form className="searchbar" role="search" onSubmit={search}>
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <Search size={18} aria-hidden="true" />
            <input id="site-search" type="search" placeholder="Search products" value={term}
              onChange={(e) => setTerm(e.target.value)} data-testid="search-input" autoComplete="off" />
            <button type="submit" className="btn btn--primary btn--sm" data-testid="search-submit">Search</button>
          </form>
          {!user && (
            <div className="header__auth-mobile">
              <Link to="/login" className="btn btn--outline">Log in</Link>
              <Link to="/register" className="btn btn--primary">Register</Link>
            </div>
          )}
        </div>

        <div className="header__actions">
          {canShop && (
            <>
              <Link to="/wishlist" className="icon-btn" aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} saved` : ''}`} data-testid="nav-wishlist">
                <Heart size={22} aria-hidden="true" />
                {wishlistCount > 0 && <span className="count-badge" data-testid="wishlist-count">{wishlistCount}</span>}
              </Link>
              <Link to="/cart" className="icon-btn" aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`} data-testid="nav-cart">
                <ShoppingBag size={22} aria-hidden="true" />
                {cartCount > 0 && <span className="count-badge" data-testid="cart-count">{cartCount}</span>}
              </Link>
            </>
          )}

          {user ? (
            <div className="account" ref={accountRef}>
              <button type="button" className="account__btn" aria-expanded={accountOpen} aria-haspopup="menu"
                onClick={() => setAccountOpen((o) => !o)} data-testid="account-menu">
                <span className="avatar" aria-hidden="true">{user.fullName.trim().charAt(0).toUpperCase()}</span>
                <span className="account__name">{user.fullName.split(' ')[0]}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {accountOpen && (
                <div className="menu" role="menu">
                  {isAdmin ? (
                    <Link role="menuitem" to="/admin"><LayoutDashboard size={17} aria-hidden="true" /> Admin panel</Link>
                  ) : (
                    <>
                      <Link role="menuitem" to="/dashboard"><LayoutDashboard size={17} aria-hidden="true" /> My dashboard</Link>
                      <Link role="menuitem" to="/orders"><Package size={17} aria-hidden="true" /> My orders</Link>
                      <Link role="menuitem" to="/profile"><UserIcon size={17} aria-hidden="true" /> My profile</Link>
                    </>
                  )}
                  <button role="menuitem" type="button" onClick={signOut} data-testid="logout"><LogOut size={17} aria-hidden="true" /> Log out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="header__auth">
              <Link to="/login" className="btn btn--ghost btn--sm" data-testid="nav-login">Log in</Link>
              <Link to="/register" className="btn btn--primary btn--sm" data-testid="nav-register">Register</Link>
            </div>
          )}

          <button type="button" className="icon-btn header__burger" aria-expanded={menuOpen} aria-controls="site-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
