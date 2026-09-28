import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, FolderKanban, Plus } from 'lucide-react';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import { getProjects, updateProject } from '../../projects/services/projectService.js';
import { useAuth } from '../../auth/context/AuthContext.jsx';

function getId(value) {
  return typeof value === 'string' ? value : value?.id || value?._id;
}

function dateKey(value) {
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

function hasSchedule(project) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey(project.startDate)) && /^\d{4}-\d{2}-\d{2}$/.test(dateKey(project.endDate));
}

function formatDate(value) {
  const key = dateKey(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return 'Not set';
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(year, month - 1, day));
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [savingProjectId, setSavingProjectId] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    getProjects().then((result) => {
      if (!active) return;
      const ownedProjects = (result.data.projects || []).filter((project) => getId(project.owner) === user?.id);
      const calendarProjects = ownedProjects.filter(hasSchedule);
      setProjects(ownedProjects);
      setSelectedProjectId((current) => calendarProjects.some((project) => getId(project) === current)
        ? current
        : getId(calendarProjects[0]) || '');
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load your project calendar.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    return () => { active = false; };
  }, [reloadKey, user?.id]);

  const selectedProject = projects.find((project) => getId(project) === selectedProjectId) || null;
  const scheduledProjects = useMemo(() => projects.filter(hasSchedule), [projects]);

  const startDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (days.length % 7 !== 0) days.push(null);
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
  const todayKey = localDateKey(new Date());

  function moveMonth(amount) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function goToToday() {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  async function handleEndDateChange(event) {
    const nextEndDate = event.target.value;
    if (!selectedProject || !nextEndDate) return;
    const projectId = getId(selectedProject);
    const previousEndDate = selectedProject.endDate;
    if (nextEndDate < dateKey(selectedProject.startDate)) {
      setError('End date must be on or after the project start date.');
      return;
    }

    setError('');
    setSavingProjectId(projectId);
    setProjects((current) => current.map((project) => getId(project) === projectId
      ? { ...project, endDate: `${nextEndDate}T00:00:00.000Z` }
      : project));

    try {
      const result = await updateProject(projectId, { endDate: nextEndDate });
      const updatedProject = result.data.project;
      setProjects((current) => current.map((project) => getId(project) === projectId ? updatedProject : project));
    } catch (requestError) {
      setProjects((current) => current.map((project) => getId(project) === projectId
        ? { ...project, endDate: previousEndDate }
        : project));
      setError(requestError.response?.data?.message || 'Unable to update the project end date.');
    } finally {
      setSavingProjectId('');
    }
  }

  return (
    <div className="animate-lift-in space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c83]">Your projects</p><h1 className="font-display mt-1 text-3xl font-semibold text-[#26332d]">Calendar</h1><p className="mt-2 text-sm text-[#748078]">Project schedules by start and end date.</p></div>
        <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#245b49] px-4 text-sm font-semibold text-white transition hover:bg-[#194a39]" to="/projects"><Plus aria-hidden="true" size={15} />New project</Link>
      </header>

      {error && <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e7c9c1] bg-[#fff7f4] px-4 py-3" role="alert"><p className="text-sm text-[#984b3c]">{import.meta.env.DEV ? error : 'Unable to update your calendar.'}</p><button className="text-sm font-semibold text-[#984b3c] underline" onClick={() => setReloadKey((key) => key + 1)} type="button">Retry</button></section>}

      {isLoading ? <div className="grid min-h-80 place-items-center rounded-xl border border-[#e1e7e1] bg-white"><LoadingSpinner label="Loading project calendar" /></div> : projects.length === 0 ? <section className="grid min-h-72 place-items-center rounded-xl border border-dashed border-[#cfd9d0] bg-white/70 p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#e8f0e8] text-[#28664c]"><FolderKanban aria-hidden="true" size={21} /></span><h2 className="font-display mt-4 text-lg font-semibold text-[#34413b]">No projects yet</h2><p className="mt-1 text-sm text-[#7d8981]">Projects you create will appear here with their scheduled dates.</p><Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#28664c] hover:underline" to="/projects"><Plus aria-hidden="true" size={15} />Create a project</Link></div></section> : <>
        <section aria-label="Project calendar" className="overflow-hidden rounded-xl border border-[#e1e7e1] bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ed] px-4 py-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[#eaf1eb] text-[#28664c]"><CalendarDays aria-hidden="true" size={16} /></span><h2 aria-live="polite" className="font-display text-sm font-semibold text-[#26332d]">{monthLabel}</h2></div><div className="flex items-center gap-1"><button aria-label="Previous month" className="grid size-8 place-items-center rounded-md text-[#75847a] hover:bg-[#f3f6f3]" onClick={() => moveMonth(-1)} type="button"><ArrowLeft size={15} /></button><button className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#28664c] hover:bg-[#f3f6f3]" onClick={goToToday} type="button">Today</button><button aria-label="Next month" className="grid size-8 place-items-center rounded-md text-[#75847a] hover:bg-[#f3f6f3]" onClick={() => moveMonth(1)} type="button"><ArrowRight size={15} /></button></div></header>
          <div className="grid grid-cols-7 border-b border-[#edf0ed] bg-[#f8faf7] text-center">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => <span className="py-2 text-[10px] font-semibold uppercase text-[#7e8c83]" key={weekday}>{weekday}</span>)}</div>
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              if (!day) return <div aria-hidden="true" className="min-h-24 border-b border-r border-[#edf0ed] bg-[#fbfcfb] p-1.5 sm:min-h-32" key={`blank-${index}`} />;
              const date = new Date(month.getFullYear(), month.getMonth(), day);
              const key = localDateKey(date);
              const dayProjects = scheduledProjects.filter((project) => dateKey(project.startDate) <= key && key <= dateKey(project.endDate));
              return <div className="min-h-24 border-b border-r border-[#edf0ed] p-1.5 sm:min-h-32 sm:p-2" key={key}><span className={`grid size-6 place-items-center rounded-full text-[11px] ${key === todayKey ? 'bg-[#e8e1f8] font-bold text-[#5e47a3]' : 'text-[#66756c]'}`}>{day}</span><div className="mt-1 grid gap-1">{dayProjects.slice(0, 3).map((project) => <button aria-pressed={getId(project) === selectedProjectId} className={`block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium transition sm:text-xs ${getId(project) === selectedProjectId ? 'bg-[#e8e1f8] text-[#4b377d]' : 'bg-[#f1eef7] text-[#5e47a3] hover:bg-[#e8e1f8]'}`} key={getId(project)} onClick={() => setSelectedProjectId(getId(project))} title={`${project.name}: ${formatDate(project.startDate)} – ${formatDate(project.endDate)}`} type="button">{project.name}</button>)}{dayProjects.length > 3 && <span className="px-1 text-[10px] text-[#7e8c83]">+{dayProjects.length - 3} more</span>}</div></div>;
            })}
          </div>
          {scheduledProjects.length === 0 && <p className="border-t border-[#edf0ed] px-4 py-3 text-xs text-[#7e8c83]">No projects have a schedule yet. Create a project with start and end dates to add it here.</p>}
        </section>

        <section aria-label="Selected project schedule" className="max-w-2xl rounded-xl border border-[#e1e7e1] bg-white p-5">
          {selectedProject ? <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]"><div><p className="text-xs font-bold uppercase tracking-wider text-[#7e8c83]">Selected project</p><h2 className="font-display mt-1 text-xl font-semibold text-[#26332d]">{selectedProject.name}</h2><p className="mt-2 text-sm text-[#68766e]">Starts {formatDate(selectedProject.startDate)}</p><p className="mt-1 text-sm text-[#68766e]">Ends {formatDate(selectedProject.endDate)}</p></div><div><Input label="End date" min={dateKey(selectedProject.startDate)} name="calendar-project-end-date" onChange={handleEndDateChange} type="date" value={dateKey(selectedProject.endDate)} /><p className="mt-1 text-[11px] text-[#7e8c83]">{savingProjectId === getId(selectedProject) ? 'Saving…' : 'Changes save automatically.'}</p></div></div> : <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[#f1eef7] text-[#5e47a3]"><CalendarDays aria-hidden="true" size={16} /></span><div><h2 className="text-sm font-semibold text-[#34413b]">Project details</h2><p className="mt-1 text-xs text-[#7e8c83]">Select a project name on the calendar to see its schedule.</p></div></div>}
        </section>
      </>}
    </div>
  );
}
