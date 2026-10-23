import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../api/types';
import { PageSpinner } from '../components/Feedback';

/**
 * Guards a group of routes.
 *  - Not signed in  -> login page (remembers where you were going)
 *  - Wrong role     -> Access Denied page
 * The API enforces the same rules independently; this only gives a better experience.
 */
export default function ProtectedRoute({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner label="Checking your session" />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search, message: 'Please log in to continue.' }} />;
  }
  if (user.role !== role) return <Navigate to="/access-denied" replace />;
  return <Outlet />;
}
