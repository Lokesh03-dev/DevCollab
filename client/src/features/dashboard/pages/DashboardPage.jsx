import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle2, CircleDashed, FolderKanban, ListTodo, Plus, Sparkles, UsersRound } from 'lucide-react';
import ProjectCard from '../../../components/projects/ProjectCard.jsx';
import TaskCard from '../../../components/tasks/TaskCard.jsx';
import TaskCalendar from '../../../components/tasks/TaskCalendar.jsx';
import { ActivityRowSkeleton, MetricSkeleton, ProjectCardSkeleton, TaskRowSkeleton } from '../../../components/ui/Skeleton.jsx';
import { getProjectActivity } from '../../projects/services/activityService.js';
import { getProjects } from '../../projects/services/projectService.js';
import { getProjectTasks } from '../../tasks/services/taskService.js';
import { useAuth } from '../../auth/context/AuthContext.jsx';

function getProjectId(project) {
  const id = project?.id || project?._id;
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id) ? id : null;
}

function getGreeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityError, setActivityError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError('');
      setActivityError('');

      try {
        const projectResult = await getProjects();
        const projectList = projectResult.data.projects || [];
        const projectIds = projectList.map(getProjectId);
        if (projectIds.some((id) => !id)) throw new Error('A project is missing a valid ID.');

        const taskResults = await Promise.all(projectIds.map((id) => getProjectTasks(id)));
        const taskList = taskResults.flatMap((result, index) => (result.data.tasks || []).map((task) => ({
          ...task,
          projectName: projectList[index].name,
          projectId: projectIds[index],
        })));
        const activityResults = await Promise.allSettled(projectIds.map((id) => getProjectActivity(id)));
        const activityList = activityResults.flatMap((result, index) => result.status === 'fulfilled'
          ? (result.value.data.activities || []).map((activity) => ({ ...activity, projectName: projectList[index].name, projectId: projectIds[index] }))
          : []);

        if (active) {
          setProjects(projectList);
          setTasks(taskList);
          setActivities(activityList.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)).slice(0, 5));
          if (activityResults.some((result) => result.status === 'rejected')) setActivityError('Some project activity could not be loaded.');
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load your workspace right now.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => { active = false; };
  }, [reloadKey]);

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const activeProjects = projects.filter((project) => project.status === 'active').length;
  const recentTasks = [...tasks]
    .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
    .slice(0, 4);
  const tasksByProject = useMemo(() => tasks.reduce((groups, task) => {
    groups[task.projectId] = [...(groups[task.projectId] || []), task];
    return groups;
  }, {}), [tasks]);
  const primaryProjectId = projects[0] ? getProjectId(projects[0]) : null;
  const taskHref = projects[0] ? `/projects/${getProjectId(projects[0])}?tab=tasks` : '/projects';
  const activityHref = activities[0] ? `/projects/${activities[0].projectId}?tab=activity` : '/projects';
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const greeting = getGreeting(new Date().getHours());
  const metrics = [
    { label: 'Total projects', value: projects.length, detail: `${activeProjects} active`, Icon: FolderKanban, tone: 'text-[#28664c]', href: '/projects' },
    { label: 'Active projects', value: activeProjects, detail: `${projects.filter((project) => project.status === 'planning').length} in planning`, Icon: CircleDashed, tone: 'text-[#bd694e]', href: '/projects' },
    { label: 'Pending tasks', value: tasks.length - completedTasks, detail: `${tasks.length} total tasks`, Icon: ListTodo, tone: 'text-[#6675a0]', href: taskHref },
    { label: 'Completed tasks', value: completedTasks, detail: tasks.length ? `${Math.round((completedTasks / tasks.length) * 100)}% of all tasks` : 'No tasks yet', Icon: CheckCircle2, tone: 'text-[#547963]', href: taskHref },
  ];

  return (
    <div className="animate-lift-in space-y-8">
      <section className="relative overflow-hidden rounded-xl border border-[#d7e3d9] bg-[#e8f0e8] p-6 md:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 size-56 rounded-full border-36 border-white/25" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#62806b]"><Sparkles aria-hidden="true" size={14} />{dateLabel}</p>
            <h2 className="font-display mt-2 text-3xl font-semibold text-[#263b2e]">{greeting}, {user?.name?.split(' ')[0] || 'there'}.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#65786a]">Here’s what’s happening across your workspace.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#245b49] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#194a39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82b9a0]" to="/projects"><Plus aria-hidden="true" size={16} />New project</Link>
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd8cc] bg-white/70 px-4 py-2 text-sm font-semibold text-[#365342] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82b9a0]" to={taskHref}><ListTodo aria-hidden="true" size={15} />New task</Link>
            {primaryProjectId && <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd8cc] bg-white/70 px-4 py-2 text-sm font-semibold text-[#365342] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82b9a0]" to={`/projects/${primaryProjectId}?tab=members`}><UsersRound aria-hidden="true" size={15} />Team</Link>}
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd8cc] bg-white/70 px-4 py-2 text-sm font-semibold text-[#365342] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82b9a0]" to={activityHref}>View activity<ArrowRight aria-hidden="true" size={15} /></Link>
          </div>
        </div>
      </section>

      <section aria-label="Workspace summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? metrics.map((metric) => <MetricSkeleton key={metric.label} />) : metrics.map(({ Icon, ...metric }) => <Link className="group rounded-xl border border-[#e1e7e1] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#c7d5c9] hover:shadow-[0_10px_28px_rgba(32,42,39,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82b9a0]" key={metric.label} to={metric.href}><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-[#78857d]">{metric.label}</p><span className={`grid size-9 place-items-center rounded-lg bg-[#f1f5f1] ${metric.tone}`}><Icon aria-hidden="true" size={17} /></span></div><p className={`font-display mt-4 text-3xl font-semibold ${metric.tone}`}>{metric.value}</p><p className="mt-1 text-xs text-[#87928b]">{metric.detail}</p></Link>)}
      </section>

      {error && <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e7c9c1] bg-[#fff7f4] px-4 py-3" role="alert"><div><p className="text-sm font-semibold text-[#984b3c]">We couldn’t load your workspace.</p><p className="mt-1 text-xs text-[#9c7068]">{import.meta.env.DEV ? error : 'Please try again in a moment.'}</p></div><button className="text-sm font-semibold text-[#984b3c] underline" onClick={() => setReloadKey((key) => key + 1)} type="button">Retry</button></section>}

      <section>
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c83]">Your team is building</p><h2 className="font-display mt-1 text-xl font-semibold text-[#26332d]">Projects in focus</h2></div><Link className="inline-flex items-center gap-1 text-sm font-semibold text-[#28664c] hover:underline" to="/projects">All projects<ArrowRight aria-hidden="true" size={14} /></Link></div>
        {isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <ProjectCardSkeleton key={index} />)}</div> : projects.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.slice(0, 3).map((project) => <ProjectCard key={getProjectId(project)} project={project} tasks={tasksByProject[getProjectId(project)] || []} />)}</div> : <div className="flex flex-col items-center rounded-xl border border-dashed border-[#cfd9d0] bg-white/70 px-6 py-9 text-center"><span className="grid size-11 place-items-center rounded-xl bg-[#e8f0e8] text-[#28664c]"><FolderKanban aria-hidden="true" size={20} /></span><h3 className="font-display mt-3 text-base font-semibold text-[#34413b]">No projects yet</h3><p className="mt-1 max-w-sm text-sm text-[#7d8981]">Create your first project and bring your team’s work into one place.</p><Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#28664c] hover:underline" to="/projects"><Plus aria-hidden="true" size={15} />Create a project</Link></div>}
      </section>

      <TaskCalendar tasks={tasks} />

      <section>
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c83]">Team queue</p><h2 className="font-display mt-1 text-xl font-semibold text-[#26332d]">Recent tasks</h2></div><span className="text-xs font-medium text-[#87928b]">{isLoading ? '' : `${tasks.length} total`}</span></div>
        {isLoading ? <div className="grid gap-2">{Array.from({ length: 3 }, (_, index) => <TaskRowSkeleton key={index} />)}</div> : recentTasks.length ? <div className="grid gap-2">{recentTasks.map((task) => <TaskCard key={task.id || task._id} task={task} />)}</div> : <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#cfd9d0] bg-white/70 p-5"><span className="grid size-10 place-items-center rounded-lg bg-[#f1f4f1] text-[#6d7d72]"><ListTodo aria-hidden="true" size={18} /></span><div><p className="text-sm font-semibold text-[#34413b]">No tasks to show</p><p className="mt-1 text-xs text-[#7d8981]">Tasks created inside your projects will appear here.</p></div></div>}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c83]">Workspace pulse</p><h2 className="font-display mt-1 text-xl font-semibold text-[#26332d]">Recent activity</h2></div>{activities.length > 0 && <Link className="text-sm font-semibold text-[#28664c] hover:underline" to={activityHref}>View feed</Link>}</div>
        {activityError && <p className="mb-3 text-xs text-[#9c7068]" role="status">{activityError}</p>}
        {isLoading ? <div className="divide-y divide-[#edf0ed] rounded-xl border border-[#e1e7e1] bg-white px-5">{Array.from({ length: 3 }, (_, index) => <ActivityRowSkeleton key={index} />)}</div> : activities.length ? <div className="divide-y divide-[#edf0ed] rounded-xl border border-[#e1e7e1] bg-white px-5">{activities.map((activity) => <Link className="flex items-start gap-3 py-4 first:pt-4 last:pb-4" key={activity.id || activity._id} to={`/projects/${activity.projectId}?tab=activity`}><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[#eef3ee] text-[#52715e]"><Activity aria-hidden="true" size={15} /></span><span className="min-w-0 flex-1"><span className="block text-sm text-[#3f4b44]">{activity.description}</span><span className="mt-1 block text-xs text-[#89948d]">{activity.projectName} · {activity.user?.name || 'A team member'} · {formatDate(activity.createdAt)}</span></span></Link>)}</div> : <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#cfd9d0] bg-white/70 p-5"><span className="grid size-10 place-items-center rounded-lg bg-[#f1f4f1] text-[#6d7d72]"><Activity aria-hidden="true" size={18} /></span><div><p className="text-sm font-semibold text-[#34413b]">No activity yet</p><p className="mt-1 text-xs text-[#7d8981]">Project updates and task changes will show up here.</p></div></div>}
      </section>
    </div>
  );
}
