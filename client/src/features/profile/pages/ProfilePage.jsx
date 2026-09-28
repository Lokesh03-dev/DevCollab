import { useEffect, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, CheckCircle2, UserRound } from 'lucide-react';
import Input from '../../../components/ui/Input.jsx';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { getProjects } from '../../projects/services/projectService.js';
import { getProjectTasks } from '../../tasks/services/taskService.js';

function getProjectId(project) {
  const id = project?.id || project?._id;
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id) ? id : null;
}

function getInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'DC';
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ projects: 0, completedTasks: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    getProjects().then(async (result) => {
      const projects = result.data.projects || [];
      const projectIds = projects.map(getProjectId);
      if (projectIds.some((id) => !id)) throw new Error('A project is missing a valid ID.');
      const taskResults = await Promise.all(projectIds.map((id) => getProjectTasks(id)));
      const completedTasks = taskResults.flatMap((taskResult) => taskResult.data.tasks || []).filter((task) => task.status === 'completed').length;
      if (active) setSummary({ projects: projects.length, completedTasks });
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load profile summary.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    return () => { active = false; };
  }, [reloadKey]);

  const joinedDate = user?.createdAt
    ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(user.createdAt))
    : 'Not available';

  return (
    <div className="animate-lift-in space-y-6">
      <section><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c83]">Account</p><h2 className="font-display mt-1 text-3xl font-semibold text-[#26332d]">My profile</h2><p className="mt-2 text-sm text-[#748078]">Your account details and contribution across the workspace.</p></section>
      {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e7c9c1] bg-[#fff7f4] px-4 py-3" role="alert"><p className="text-sm text-[#984b3c]">{import.meta.env.DEV ? error : 'We couldn’t load your workspace summary.'}</p><button className="text-sm font-semibold text-[#984b3c] underline" onClick={() => setReloadKey((key) => key + 1)} type="button">Retry</button></div>}
      <section className="max-w-4xl overflow-hidden rounded-xl border border-[#e1e7e1] bg-white">
        <header className="flex flex-wrap items-center gap-4 border-b border-[#edf0ed] bg-[#fbfcfb] p-5 md:p-7">
          {user?.profilePicture ? <img alt="" className="size-16 rounded-xl object-cover" src={user.profilePicture} /> : <span className="grid size-16 place-items-center rounded-xl bg-[#f1dfcc] font-display text-lg font-bold text-[#865235]">{getInitials(user?.name)}</span>}
          <div className="min-w-0 flex-1"><p className="font-display truncate text-xl font-semibold text-[#26332d]">{user?.name || 'Your account'}</p><p className="mt-1 truncate text-sm text-[#7b877f]">{user?.email}</p></div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f0e8] px-3 py-1.5 text-xs font-semibold capitalize text-[#3c704f]"><UserRound aria-hidden="true" size={13} />{user?.role || 'Member'}</span>
        </header>
        <div className="grid gap-4 p-5 sm:grid-cols-3 md:p-7">
          <article className="rounded-lg border border-[#e7ece7] p-4"><span className="grid size-8 place-items-center rounded-md bg-[#eaf1eb] text-[#28664c]"><BriefcaseBusiness aria-hidden="true" size={16} /></span><p className="font-display mt-3 text-2xl font-semibold text-[#26332d]">{isLoading ? '—' : summary.projects}</p><p className="mt-1 text-xs text-[#78857d]">Projects</p></article>
          <article className="rounded-lg border border-[#e7ece7] p-4"><span className="grid size-8 place-items-center rounded-md bg-[#f8efe0] text-[#9a7042]"><CheckCircle2 aria-hidden="true" size={16} /></span><p className="font-display mt-3 text-2xl font-semibold text-[#26332d]">{isLoading ? '—' : summary.completedTasks}</p><p className="mt-1 text-xs text-[#78857d]">Completed tasks</p></article>
          <article className="rounded-lg border border-[#e7ece7] p-4"><span className="grid size-8 place-items-center rounded-md bg-[#f1f4f1] text-[#65776b]"><CalendarDays aria-hidden="true" size={16} /></span><p className="font-display mt-3 truncate text-base font-semibold text-[#26332d]">{joinedDate}</p><p className="mt-1 text-xs text-[#78857d]">Member since</p></article>
        </div>
        <div className="grid gap-5 border-t border-[#edf0ed] p-5 md:grid-cols-2 md:p-7"><Input label="Full name" name="profile-name" readOnly value={user?.name || ''} /><Input label="Email address" name="profile-email" readOnly value={user?.email || ''} /><Input label="Account role" name="profile-role" readOnly value={user?.role || 'Member'} /><Input label="Joined" name="profile-joined" readOnly value={joinedDate} /></div>
      </section>
      {!isLoading && summary.projects === 0 && !error && <p className="max-w-4xl text-xs text-[#78857d]">You aren’t a member of any projects yet. Projects you join will appear in your profile summary.</p>}
      {isLoading && <div className="max-w-4xl rounded-xl border border-[#e1e7e1] bg-white p-4"><LoadingSpinner label="Loading your workspace summary" /></div>}
    </div>
  );
}
