import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center"><LoadingSpinner label="Restoring your session" /></main>;
  }

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location }} />;
}