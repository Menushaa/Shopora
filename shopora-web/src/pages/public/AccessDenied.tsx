import { Link } from 'react-router-dom';
import { useAuth, homeFor } from '../../context/AuthContext';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

export default function AccessDenied() {
  useDocumentTitle('Access denied');
  const { user } = useAuth();
  return (
    <div className="status-page" data-testid="access-denied">
      <p className="status-page__code" aria-hidden="true">403</p>
      <h1>This area is not available to your account</h1>
      <p>{user ? 'Your account does not have permission to open this page.' : 'You need to log in to open this page.'}</p>
      {user
        ? <Link to={homeFor(user)} className="btn btn--primary">Go to my dashboard</Link>
        : <Link to="/login" className="btn btn--primary">Log in</Link>}
    </div>
  );
}
