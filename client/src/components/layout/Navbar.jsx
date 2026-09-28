import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Moon, Search, Sun } from 'lucide-react';
import NotificationCenter from '../../features/notifications/components/NotificationCenter.jsx';
import { useAuth } from '../../features/auth/context/AuthContext.jsx';
import WorkspaceSearch from './WorkspaceSearch.jsx';

const pageTitles = { '/dashboard': 'Overview', '/projects': 'Projects', '/calendar': 'Calendar', '/messages': 'Messages', '/profile': 'My profile' };

function getInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'DC';
}

export default function Navbar({ onMenuToggle, onThemeToggle, theme }) {
  const location = useLocation();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const title = location.pathname.startsWith('/projects/') ? 'Project workspace' : pageTitles[location.pathname] || 'Workspace';
  const platform = typeof navigator === 'undefined' ? '' : navigator.userAgentData?.platform || navigator.platform;
  const searchShortcut = /Mac|iPhone|iPad/i.test(platform) ? '⌘ K' : 'Ctrl K';

  useEffect(() => {
    function handleShortcut(event) {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (!isTyping && ((event.key === '/' && !event.metaKey && !event.ctrlKey) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'))) {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-[#e1e7e1] bg-[#f8faf7]/95 px-4 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button aria-label="Open navigation" className="grid size-9 place-items-center rounded-lg border border-[#dce4dc] text-[#41604d] lg:hidden" onClick={onMenuToggle} type="button"><Menu size={17} /></button>
        <div className="min-w-0">{location.pathname.startsWith('/projects/') && <Link className="hidden text-[10px] font-semibold text-[#75847a] hover:text-[#28664c] sm:block" to="/projects">Projects <span aria-hidden="true">/</span></Link>}<h1 className="font-display truncate text-lg font-semibold text-[#26332d]">{title}</h1></div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button aria-label="Search workspace" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e0e6e0] bg-white px-3 text-xs font-medium text-[#78857d] transition hover:border-[#cbd7cc] hover:bg-[#fbfcfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9c9bd]" onClick={() => setSearchOpen(true)} type="button"><Search size={15} /><span className="hidden sm:inline">Search</span><kbd className="hidden rounded border border-[#e5eae5] px-1 text-[10px] sm:inline">{searchShortcut}</kbd></button>
        <NotificationCenter />
        <button aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} className="grid size-9 place-items-center rounded-lg border border-[#e0e6e0] bg-white text-[#78857d] transition hover:bg-[#fbfcfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9c9bd]" onClick={onThemeToggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} type="button">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
        {!location.pathname.startsWith('/projects/') && <Link className="hidden min-h-9 items-center gap-2 rounded-lg bg-[#245b49] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#194a39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82b9a0] sm:inline-flex" to="/projects">New project <span aria-hidden="true">+</span></Link>}
        <Link aria-label={`View profile: ${user?.name || 'your account'}`} className="grid size-9 place-items-center rounded-full bg-[#db8c63] text-xs font-bold text-[#38281f] ring-2 ring-white" to="/profile">{getInitials(user?.name)}</Link>
      </div>
      <WorkspaceSearch onClose={() => setSearchOpen(false)} open={searchOpen} />
    </header>
  );
}