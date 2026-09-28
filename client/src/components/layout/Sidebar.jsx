import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Activity, BriefcaseBusiness, CalendarDays, Code2, GitBranch, LayoutDashboard, ListTodo, LogOut, Mail, MessageSquareText, PanelLeftClose, PanelLeftOpen, UserRound, UsersRound } from 'lucide-react';
import { useAuth } from '../../features/auth/context/AuthContext.jsx';
import { getProjects } from '../../features/projects/services/projectService.js';

const links = [
  { to: '/dashboard', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', Icon: BriefcaseBusiness },
  { to: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { to: '/messages', label: 'Messages', Icon: MessageSquareText },
  { to: '/invitations', label: 'Invitations', Icon: Mail },
];

function getInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'DC';
}

export default function Sidebar({ isOpen, isCollapsed, onCollapseToggle, onNavigate, onLogout }) {
  const { user } = useAuth();
  const location = useLocation();
  const [workspaceCounts, setWorkspaceCounts] = useState(null);
  const projectMatch = location.pathname.match(/^\/projects\/([^/]+)$/);
  const projectId = projectMatch?.[1];
  const projectLinks = [
    { tab: 'tasks', label: 'Tasks', Icon: ListTodo },
    { tab: 'members', label: 'Team', Icon: UsersRound },
    { tab: 'chat', label: 'Messages', Icon: MessageSquareText },
    { tab: 'code', label: 'Code workspace', Icon: Code2 },
    { tab: 'github', label: 'GitHub', Icon: GitBranch },
    { tab: 'activity', label: 'Activity', Icon: Activity },
  ];
  const activeProjectTab = new URLSearchParams(location.search).get('tab') || 'overview';

  useEffect(() => {
    let active = true;
    getProjects().then((result) => {
      if (!active) return;
      const projects = result.data.projects;
      const memberIds = new Set(projects.flatMap((project) => (project.members || []).map((member) => member.id || member._id || member)));
      setWorkspaceCounts({ projects: projects.length, members: memberIds.size });
    }).catch(() => {
      if (active) setWorkspaceCounts({ error: 'Workspace summary unavailable' });
    });
    return () => { active = false; };
  }, []);

  const identity = user?.name || user?.email || 'Your account';

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col overflow-y-auto border-r border-white/5 bg-[#203c32] px-3 pb-4 pt-5 text-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${isCollapsed ? 'lg:w-19' : 'lg:w-62'} ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className={`flex min-h-11 items-center ${isCollapsed ? 'lg:justify-center' : 'gap-3 px-1'}`}>
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#db8c63] font-display text-sm font-bold text-[#243d33]">DC</span>
        <div className={isCollapsed ? 'lg:hidden' : ''}><p className="font-display text-base font-semibold">DevCollab</p><p className="text-[11px] text-[#b8c9bf]">Engineering workspace</p></div>
      </div>
      <button aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="absolute right-3 top-6 hidden size-8 place-items-center rounded-md text-[#b8c9bf] transition-colors hover:bg-white/10 hover:text-white lg:grid" onClick={onCollapseToggle} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} type="button">
        {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
      <p className={`mt-9 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a5b9ad] ${isCollapsed ? 'lg:sr-only' : ''}`}>Workspace</p>
      <nav aria-label="Main navigation" className="mt-3 grid gap-1">
        {links.map(({ Icon, ...link }) => <NavLink className={({ isActive }) => `group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${isActive ? 'bg-[#315744] text-white before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[#e2a176]' : 'text-[#d0ddd4] hover:bg-[#2a4a3a] hover:text-white'}`} end={link.end} key={link.to} onClick={onNavigate} title={isCollapsed ? link.label : undefined} to={link.to}><Icon aria-hidden="true" className="shrink-0" size={17} /><span className={isCollapsed ? 'lg:sr-only' : ''}>{link.label}</span></NavLink>)}
      </nav>
      {projectId && <>
        <p className={`mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a5b9ad] ${isCollapsed ? 'lg:sr-only' : ''}`}>Project</p>
        <nav aria-label="Current project navigation" className="mt-3 grid gap-1">
          {projectLinks.map(({ Icon, tab, label }) => <Link aria-current={activeProjectTab === tab ? 'page' : undefined} className={`group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${activeProjectTab === tab ? 'bg-[#315744] text-white before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[#e2a176]' : 'text-[#d0ddd4] hover:bg-[#2a4a3a] hover:text-white'}`} key={tab} onClick={onNavigate} title={isCollapsed ? label : undefined} to={`/projects/${projectId}?tab=${tab}`}><Icon aria-hidden="true" className="shrink-0" size={17} /><span className={isCollapsed ? 'lg:sr-only' : ''}>{label}</span></Link>)}
        </nav>
      </>}
      <p className={`mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a5b9ad] ${isCollapsed ? 'lg:sr-only' : ''}`}>Personal</p>
      <nav aria-label="Personal navigation" className="mt-3 grid gap-1">
        <NavLink className={({ isActive }) => `group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${isActive ? 'bg-[#315744] text-white before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[#e2a176]' : 'text-[#d0ddd4] hover:bg-[#2a4a3a] hover:text-white'}`} onClick={onNavigate} title={isCollapsed ? 'My profile' : undefined} to="/profile"><UserRound aria-hidden="true" className="shrink-0" size={17} /><span className={isCollapsed ? 'lg:sr-only' : ''}>My profile</span></NavLink>
      </nav>
      <div className="mt-auto rounded-xl border border-white/10 bg-[#2a4a3a] p-4">
        <div className={`flex items-center gap-2 ${isCollapsed ? 'lg:justify-center' : ''}`}><span className="grid size-7 shrink-0 place-items-center rounded-md bg-white/10"><BriefcaseBusiness size={14} /></span><span className={`text-[10px] font-semibold uppercase tracking-wider text-[#f2d1a6] ${isCollapsed ? 'lg:hidden' : ''}`}>Workspace</span></div>
        <div className={isCollapsed ? 'lg:hidden' : ''}><p className="mt-3 text-xs text-[#bbccc1]">{workspaceCounts?.error || (workspaceCounts ? `${workspaceCounts.projects} ${workspaceCounts.projects === 1 ? 'project' : 'projects'} · ${workspaceCounts.members} ${workspaceCounts.members === 1 ? 'member' : 'members'}` : 'Loading workspace…')}</p></div>
      </div>
      <div className={`mt-3 flex min-h-11 items-center gap-2 rounded-lg px-1 ${isCollapsed ? 'lg:justify-center' : ''}`}>
        <Link aria-label="View profile" className="grid size-9 shrink-0 place-items-center rounded-full bg-[#db8c63] text-xs font-bold text-[#38281f]" onClick={onNavigate} title={identity} to="/profile">{getInitials(user?.name)}</Link>
        <Link className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : ''}`} onClick={onNavigate} to="/profile"><span className="block truncate text-xs font-semibold">{identity}</span><span className="mt-0.5 block truncate text-[10px] text-[#b8c9bf]">{user?.email || 'Account profile'}</span></Link>
        <button aria-label="Sign out" className="grid size-8 shrink-0 place-items-center rounded-md text-[#b8c9bf] hover:bg-white/10 hover:text-white" onClick={onLogout} title="Sign out" type="button"><LogOut size={15} /></button>
      </div>
      <p className={`px-2 pt-4 text-[10px] text-[#a5b9ad] ${isCollapsed ? 'lg:sr-only' : ''}`}>DEVCOLLAB · 0.1.0</p>
    </aside>
  );
}