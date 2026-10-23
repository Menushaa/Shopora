import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

export default function About() {
  useDocumentTitle('About us');
  return (
    <div className="container page">
      <div className="page__head"><h1>About Shopora</h1><p>Your World of Shopping.</p></div>
      <div className="prose">
        <p>Shopora is an online shop built around three simple ideas: show clear prices, show real stock, and keep every order easy to follow.</p>
        <h2>What you can do here</h2>
        <ul>
          <li>Browse products by category, search by keyword, and filter by price.</li>
          <li>Save favourites to a wishlist and move them to your cart when you are ready.</li>
          <li>Check out with your saved delivery address and follow your order until it arrives.</li>
          <li>Cancel an order while it is still Pending or Confirmed.</li>
        </ul>
        <h2>A demonstration store</h2>
        <p>
          Shopora is a practice application for learning manual and automated software testing. The products are sample data,
          payments are simulated, and nothing is shipped. Feel free to explore, make mistakes, and report what you find.
        </p>
        <p><Link to="/products" className="btn btn--primary">Start shopping</Link></p>
      </div>
    </div>
  );
}
