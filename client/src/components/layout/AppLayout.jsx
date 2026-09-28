import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext.jsx';
import { useTheme } from '../../features/theme/context/ThemeContext.jsx';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-canvas min-h-screen lg:flex">
      {menuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-[#14211c]/35 lg:hidden" onClick={() => setMenuOpen(false)} type="button" />}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        isOpen={menuOpen}
        onCollapseToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onLogout={logout}
        onNavigate={() => setMenuOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <Navbar onMenuToggle={() => setMenuOpen((open) => !open)} onThemeToggle={toggleTheme} theme={theme} />
        <main className="mx-auto w-full max-w-360 px-4 py-6 md:px-8 md:py-8"><Outlet /></main>
      </div>
    </div>
  );
}