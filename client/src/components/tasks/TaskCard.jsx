const priorityStyles = {
  high: 'bg-[#f9e4de] text-[#a44837]',
  medium: 'bg-[#f8efd3] text-[#826923]',
  low: 'bg-[#e5eee8] text-[#4c725c]',
};

function formatDueDate(value) {
  if (!value) return null;
  const dateOnly = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

export default function TaskCard({ task, compact = false, onClick }) {
  const projectName = task.projectName || task.project?.name || (typeof task.project === 'string' ? task.project : 'Project');
  const assignee = task.assignedTo?.name || task.assignee || 'Unassigned';
  const assigneeInitials = assignee === 'Unassigned'
    ? '--'
    : assignee.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const dueDate = formatDueDate(task.dueDate);
  const Wrapper = onClick ? 'button' : 'article';

  return (
    <Wrapper className={`flex w-full items-center gap-3 rounded-lg border border-[#e4e9e4] bg-white p-3.5 text-left transition-colors hover:border-[#c7d4c9] ${onClick ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82b9a0]' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <span aria-label={`Status: ${task.status?.replace('-', ' ') || 'unknown'}`} className={`grid size-6 shrink-0 place-items-center rounded-md border text-[10px] ${task.status === 'completed' ? 'border-[#b8d3bf] bg-[#e6f0e8] text-[#3b704f]' : 'border-[#cdd8cf] text-[#54806a]'}`}>{task.status === 'completed' ? '✓' : ''}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#303d36]">{task.title}</span>
        <span className="mt-1 block truncate text-xs text-[#849088]">{projectName}{!compact && dueDate && ` · Due ${dueDate}`}</span>
      </span>
      <span className={`hidden rounded-full px-2 py-1 text-[10px] font-semibold capitalize sm:inline-flex ${priorityStyles[task.priority] || 'bg-[#edf1ed] text-[#526158]'}`}>{task.priority || 'medium'}</span>
      <span aria-label={`Assigned to ${assignee}`} className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e8eee9] text-[10px] font-bold text-[#41624d]" title={assignee}>{assigneeInitials}</span>
    </Wrapper>
  );
}