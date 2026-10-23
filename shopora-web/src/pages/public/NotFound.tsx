import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

interface Props { title?: string; message?: string; backTo?: string; backLabel?: string }

/** 404 page. Also used inside the product page when a product does not exist. */
export default function NotFound({
  title = 'We could not find that page',
  message = 'The link may be broken, or the page may have moved.',
  backTo = '/',
  backLabel = 'Go to the home page',
}: Props) {
  useDocumentTitle('Page not found');
  return (
    <div className="status-page" data-testid="not-found">
      <p className="status-page__code" aria-hidden="true">404</p>
      <h1>{title}</h1>
      <p>{message}</p>
      <Link to={backTo} className="btn btn--primary">{backLabel}</Link>
    </div>
  );
}
