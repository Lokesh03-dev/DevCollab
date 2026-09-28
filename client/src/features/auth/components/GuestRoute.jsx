import { Navigate, Outlet } from 'react-router-dom';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center"><LoadingSpinner label="Restoring your session" /></main>;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}