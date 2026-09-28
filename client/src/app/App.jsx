import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import GuestRoute from '../features/auth/components/GuestRoute.jsx';
import ProtectedRoute from '../features/auth/components/ProtectedRoute.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import RegisterPage from '../features/auth/pages/RegisterPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import CalendarPage from '../features/dashboard/pages/CalendarPage.jsx';
import ProjectDetailPage from '../features/projects/pages/ProjectDetailPage.jsx';
import ProjectsPage from '../features/projects/pages/ProjectsPage.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import ProfilePage from '../features/profile/pages/ProfilePage.jsx';
import InvitationsPage from '../features/projects/pages/InvitationsPage.jsx';

const MessagesPage = lazy(() => import('../features/messages/pages/MessagesPage.jsx'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/messages" element={<Suspense fallback={<div className="grid min-h-64 place-items-center"><LoadingSpinner label="Loading messages" /></div>}><MessagesPage /></Suspense>} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/invitations" element={<InvitationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}