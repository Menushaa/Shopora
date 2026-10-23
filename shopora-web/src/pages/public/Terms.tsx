import { useDocumentTitle } from '../../lib/useDocumentTitle';

export default function Terms() {
  useDocumentTitle('Terms and conditions');
  return (
    <div className="container page">
      <div className="page__head"><h1>Terms and conditions</h1><p>The ground rules for using Shopora.</p></div>
      <div className="prose">
        <p><em>Shopora is a demonstration store built for learning software testing. These terms describe how the practice store works.</em></p>
        <h2>Using the store</h2>
        <ul>
          <li>Keep your login details private and use a strong password.</li>
          <li>Give accurate information when you register and when you place an order.</li>
        </ul>
        <h2>Products and prices</h2>
        <ul>
          <li>Prices are shown in Sri Lankan rupees (Rs.) and include any listed discount.</li>
          <li>The price and availability at the moment you place an order are the ones that apply.</li>
          <li>Products can be withdrawn, and stock can run out, at any time.</li>
        </ul>
        <h2>Orders and payment</h2>
        <ul>
          <li>Payments are simulated. No real money is taken and no goods are shipped.</li>
          <li>You can cancel an order while it is Pending or Confirmed.</li>
        </ul>
        <h2>Accounts</h2>
        <p>We may deactivate an account that is used in a way that harms the store or other users.</p>
      </div>
    </div>
  );
}
