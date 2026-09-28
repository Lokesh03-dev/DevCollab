import TaskCard from './TaskCard.jsx';
import { CheckCircle2, CircleDashed, ListTodo } from 'lucide-react';

const columns = [
  { status: 'todo', label: 'To do', Icon: ListTodo },
  { status: 'in-progress', label: 'In progress', Icon: CircleDashed },
  { status: 'completed', label: 'Completed', Icon: CheckCircle2 },
];

export default function TaskBoard({ tasks, onStatusChange, onDelete, onOpen }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {columns.map(({ Icon, ...column }) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);

        return (
          <section aria-label={`${column.label} tasks`} className="min-w-0 rounded-xl border border-[#e1e7e1] bg-[#f8faf7] p-3" key={column.status}>
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#34413b]"><Icon aria-hidden="true" className="text-[#718278]" size={15} />{column.label}</h3>
              <span className="grid min-w-6 place-items-center rounded-full bg-white px-1.5 py-0.5 text-xs font-semibold text-[#7b877f]">{columnTasks.length}</span>
            </div>
            <div className="grid gap-2">
              {columnTasks.map((task) => (
                <div className="grid gap-2" key={task.id || task._id}>
                  <TaskCard onClick={() => onOpen?.(task)} task={task} />
                  <label className="sr-only" htmlFor={`task-status-${task.id || task._id}`}>Change status for {task.title}</label>
                  <select className="h-8 rounded-md border border-[#dce4dc] bg-white px-2 text-xs text-[#536159]" id={`task-status-${task.id || task._id}`} onChange={(event) => onStatusChange(task, event.target.value)} value={task.status}>
                    {columns.map((option) => <option key={option.status} value={option.status}>{option.label}</option>)}
                  </select>
                  <button aria-label={`Delete ${task.title}`} className="justify-self-end rounded px-2 py-1 text-xs font-semibold text-[#a44837] hover:bg-[#fff0ec]" onClick={() => onDelete?.(task)} type="button">Delete</button>
                </div>
              ))}
              {columnTasks.length === 0 && <div className="rounded-lg border border-dashed border-[#d4ddd5] px-3 py-6 text-center"><p className="text-xs font-medium text-[#6f7d73]">Nothing here yet</p><p className="mt-1 text-[11px] text-[#87928b]">Tasks in this stage will appear here.</p></div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}