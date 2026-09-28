import { Link } from 'react-router-dom';

const statusStyles = {
  planning: 'bg-[#f8efd3] text-[#826923]',
  active: 'bg-[#e2f0e7] text-[#276449]',
  completed: 'bg-[#e8eaf5] text-[#565c8a]',
};

function getMemberName(member) {
  return typeof member === 'string' ? member : member.name || member.email || 'Member';
}

function formatLastUpdated(value) {
  if (!value || Number.isNaN(new Date(value).valueOf())) return null;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

export default function ProjectCard({ project, tasks }) {
  const projectId = project.id || project._id;
  const completedTasks = tasks?.filter((task) => task.status === 'completed').length || 0;
  const taskProgress = tasks?.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const lastUpdated = formatLastUpdated(project.updatedAt);

  return (
    <Link aria-label={`Open ${project.name}`} className="group block rounded-xl border border-[#e0e6e0] bg-white p-5 shadow-[0_2px_12px_rgba(32,42,39,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-[#bfcec1] hover:shadow-[0_10px_28px_rgba(32,42,39,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82b9a0]" to={`/projects/${projectId}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-[#e0efe5] font-display text-sm font-bold text-[#276449]">{project.name.slice(0, 2).toUpperCase()}</span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyles[project.status] || 'bg-[#edf1ed] text-[#526158]'}`}>{project.status}</span>
      </div>
      <div className="mt-5">
        <h3 className="font-display mt-1 text-lg font-semibold text-[#202a27]">{project.name}</h3>
        <p className="mt-1.5 min-h-10 text-sm leading-5 text-[#718078]">{project.description || 'No description yet.'}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#edf0ed] pt-4">
        <div aria-label={`${(project.members || []).length} project members`} className="flex -space-x-2">
          {(project.members || []).slice(0, 4).map((member, index) => {
            const name = getMemberName(member);
            const memberId = typeof member === 'string' ? member : member.id || member._id || name;
            const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
            return <span aria-label={name} className={`grid size-7 place-items-center rounded-full border-2 border-white text-[9px] font-bold text-white ${['bg-[#436f5a]', 'bg-[#c36c52]', 'bg-[#7786a6]', 'bg-[#bd9c41'][index % 4]}`} key={memberId} title={name}>{initials}</span>;
          })}
        </div>
        <span className="text-xs text-[#87928b]">{(project.members || []).length} {(project.members || []).length === 1 ? 'member' : 'members'}</span>
      </div>
      {project.technologies?.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{project.technologies.slice(0, 3).map((technology) => <span className="rounded-md bg-[#f1f4f1] px-2 py-1 text-[10px] font-medium text-[#647168]" key={technology}>{technology}</span>)}</div>}
      {tasks !== undefined && <div className="mt-4 border-t border-[#edf0ed] pt-3">{tasks.length ? <><div className="flex items-center justify-between text-[11px] text-[#748078]"><span>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span><span>{completedTasks} completed</span></div><div aria-label={`${taskProgress}% of project tasks complete`} className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf1ed]"><div className="h-full rounded-full bg-[#4c8c6d] transition-[width]" style={{ width: `${taskProgress}%` }} /></div></> : <p className="text-[11px] text-[#748078]">No tasks yet</p>}</div>}
      <div className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold text-[#28664c]"><span>Open project</span><span className="ml-auto text-[10px] font-normal text-[#87928b]">{lastUpdated ? `Updated ${lastUpdated}` : ''}</span><span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">-&gt;</span></div>
    </Link>
  );
}