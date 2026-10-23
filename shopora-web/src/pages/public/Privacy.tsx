import { useDocumentTitle } from '../../lib/useDocumentTitle';

export default function Privacy() {
  useDocumentTitle('Privacy policy');
  return (
    <div className="container page">
      <div className="page__head"><h1>Privacy policy</h1><p>How Shopora handles your information.</p></div>
      <div className="prose">
        <p><em>Shopora is a demonstration store for software testing. Please do not enter real personal or payment information.</em></p>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: your name, address and email address.</li>
          <li>Order details: what you ordered, delivery addresses and order history.</li>
          <li>Messages you send through the contact form.</li>
        </ul>
        <h2>How we protect it</h2>
        <ul>
          <li>Passwords are stored only as secure one-way hashes, never as plain text.</li>
          <li>You can only see your own cart, wishlist, addresses and orders.</li>
          <li>Card numbers are never stored; only the last four digits of a simulated card are kept.</li>
        </ul>
        <h2>How we use it</h2>
        <p>We use your information to run your account, process your orders and answer your messages. We do not sell it.</p>
        <h2>Your choices</h2>
        <p>You can update your name and address from your profile at any time. To close your account, contact us.</p>
      </div>
    </div>
  );
}
