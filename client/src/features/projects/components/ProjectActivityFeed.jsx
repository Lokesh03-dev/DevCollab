import { useEffect, useState } from 'react';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import { getProjectActivity } from '../services/activityService.js';

function activityTime(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function getInitials(name) {
  return name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

export default function ProjectActivityFeed({ projectId }) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getProjectActivity(projectId)
      .then((result) => {
        if (active) setActivities(result.data.activities);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load project activity.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [projectId]);

  if (isLoading) return <div className="rounded-xl border border-[#e1e7e1] bg-white p-8"><LoadingSpinner label="Loading activity" /></div>;
  if (error) return <p className="rounded-lg border border-[#e7c9c1] bg-[#fff7f4] px-4 py-3 text-sm text-[#984b3c]" role="alert">{error}</p>;
  if (activities.length === 0) return <div className="rounded-xl border border-dashed border-[#cfd9d0] bg-white/70 p-10 text-center"><p className="font-display text-lg font-semibold text-[#34413b]">No activity yet</p><p className="mt-1 text-sm text-[#7d8981]">Project updates will appear here as the team works.</p></div>;

  return (
    <section aria-label="Project activity" className="rounded-xl border border-[#e1e7e1] bg-white p-5 md:p-6">
      <header className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c83]">Workspace pulse</p><h3 className="font-display mt-1 text-xl font-semibold text-[#26332d]">Recent activity</h3></header>
      <ol className="relative grid gap-0">
        {activities.map((activity, index) => (
          <li className="relative flex gap-3 pb-5 last:pb-0" key={activity.id || activity._id}>
            {index < activities.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-4 top-9 w-px bg-[#e5ebe5]" />}
            <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-[#e8f0e8] text-[10px] font-bold text-[#41624d]">{getInitials(activity.user?.name)}</span>
            <div className="min-w-0 flex-1 pt-0.5"><p className="text-sm leading-5 text-[#34413b]">{activity.description}</p><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#87928b]"><span>{activity.user?.name || 'A team member'}</span><span aria-hidden="true">·</span><time dateTime={activity.createdAt}>{activityTime(activity.createdAt)}</time>{activity.relatedTask && <><span aria-hidden="true">·</span><span>Task: {activity.relatedTask.title}</span></>}{activity.relatedFile && <><span aria-hidden="true">·</span><span>File: {activity.relatedFile.path}</span></>}</div></div>
          </li>
        ))}
      </ol>
    </section>
  );
}