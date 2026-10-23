import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const QA: { q: string; a: React.ReactNode }[] = [
  { q: 'Do I need an account to browse?', a: 'No. Anyone can browse, search and view products. You need an account to use the cart, wishlist and checkout.' },
  { q: 'What makes a good password?', a: 'At least 8 characters with a letter, a number and a special character such as ! or @. Passwords are never stored as plain text.' },
  { q: 'I forgot my password. What now?', a: <>Use <Link to="/forgot-password">Forgot password</Link>. The reset link works once and expires after 30 minutes.</> },
  { q: 'Why can I not add a product to my cart?', a: 'Products that are out of stock or no longer for sale cannot be added, and you cannot add more units than are in stock.' },
  { q: 'How does payment work?', a: 'Payment is simulated. Use the test card 4111 1111 1111 1111 for an approved payment. No real money is ever taken.' },
  { q: 'Can I cancel an order?', a: 'Yes, while the order is Pending or Confirmed. The items return to stock. Once an order is Processing, Shipped or Delivered it can no longer be cancelled.' },
  { q: 'What do the order statuses mean?', a: 'Pending (received), Confirmed (accepted), Processing (being prepared), Shipped (on its way), Delivered (arrived) and Cancelled.' },
  { q: 'Why was my account locked?', a: 'After 5 incorrect password attempts an account is locked for 15 minutes to protect it. Try again later or reset your password.' },
];

export default function Faq() {
  useDocumentTitle('Questions and answers');
  return (
    <div className="container page">
      <div className="page__head"><h1>Questions and answers</h1><p>Quick answers to the things people ask most.</p></div>
      <div className="faq" data-testid="faq-list">
        {QA.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <div className="faq__body"><p>{item.a}</p></div>
          </details>
        ))}
      </div>
      <p style={{ marginTop: 28 }}>Still stuck? <Link to="/contact">Contact us</Link>.</p>
    </div>
  );
}
