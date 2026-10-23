import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Logo light />
          <p>Browse, save and order the things you love, all in one friendly place.</p>
          <ul className="footer__contact">
            <li><Mail size={16} aria-hidden="true" /> support@shopora.example</li>
            <li><Phone size={16} aria-hidden="true" /> +94 11 234 5678</li>
            <li><MapPin size={16} aria-hidden="true" /> 25 Galle Road, Colombo 03</li>
          </ul>
        </div>
        <nav aria-label="Shop">
          <h2 className="footer__title">Shop</h2>
          <ul>
            <li><Link to="/products">All products</Link></li>
            <li><Link to="/categories">Categories</Link></li>
            <li><Link to="/wishlist">Wishlist</Link></li>
            <li><Link to="/orders">My orders</Link></li>
          </ul>
        </nav>
        <nav aria-label="Help">
          <h2 className="footer__title">Help</h2>
          <ul>
            <li><Link to="/faq">Questions and answers</Link></li>
            <li><Link to="/contact">Contact us</Link></li>
            <li><Link to="/about">About Shopora</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="footer__title">Legal</h2>
          <ul>
            <li><Link to="/privacy">Privacy policy</Link></li>
            <li><Link to="/terms">Terms and conditions</Link></li>
          </ul>
        </nav>
      </div>
      <div className="container footer__legal">
        <p>&copy; {new Date().getFullYear()} Shopora. A demonstration store for software testing practice: no real payments are taken and nothing is shipped.</p>
      </div>
    </footer>
  );
}
