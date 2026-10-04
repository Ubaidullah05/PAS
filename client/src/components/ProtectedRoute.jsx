import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { can } from '../lib/labels';

/**
 * Front-end guard. The server repeats every one of these checks, so
 * hiding a page here is only about keeping the interface tidy.
 */
export default function ProtectedRoute({ children, roles, permission }) {
  const { user, booting } = useApp();
  const location = useLocation();

  if (booting) {
    return (
      <div className="page-loader">
        <div className="spinner spinner-dark" />
        <p>Getting things ready…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  if (permission && !can(user, permission)) return <Navigate to="/dashboard" replace />;

  return children;
}
