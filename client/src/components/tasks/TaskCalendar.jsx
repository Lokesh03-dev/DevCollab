import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, CircleCheck } from 'lucide-react';

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value) {
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export default function TaskCalendar({ tasks }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(today));
  const calendarTasks = useMemo(() => tasks.flatMap((task) => {
    const dueDate = task.dueDate ? parseDate(task.dueDate) : null;
    return dueDate ? [{ ...task, dueDate, dueKey: dateKey(dueDate) }] : [];
  }), [tasks]);
  const tasksByDay = useMemo(() => calendarTasks.reduce((groups, task) => {
    groups[task.dueKey] = [...(groups[task.dueKey] || []), task];
    return groups;
  }, {}), [calendarTasks]);
  const startDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const selectedTasks = tasksByDay[selectedDate] || [];
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
  const todayKey = dateKey(today);

  function moveMonth(amount) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function goToToday() {
    const currentDate = new Date();
    setMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    setSelectedDate(dateKey(currentDate));
  }

  return (
    <section aria-label="Task deadline calendar" className="overflow-hidden rounded-xl border border-[#e1e7e1] bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-[#edf0ed] px-4 py-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[#eaf1eb] text-[#28664c]"><CalendarDays aria-hidden="true" size={16} /></span><div><h3 className="font-display text-sm font-semibold text-[#26332d]">Task calendar</h3><p className="text-[10px] text-[#87928b]">Deadlines from your projects</p></div></div><div className="flex items-center gap-1"><button aria-label="Previous month" className="grid size-8 place-items-center rounded-md text-[#75847a] hover:bg-[#f3f6f3]" onClick={() => moveMonth(-1)} type="button"><ArrowLeft size={15} /></button><button className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#28664c] hover:bg-[#f3f6f3]" onClick={goToToday} type="button">Today</button><button aria-label="Next month" className="grid size-8 place-items-center rounded-md text-[#75847a] hover:bg-[#f3f6f3]" onClick={() => moveMonth(1)} type="button"><ArrowRight size={15} /></button></div></header>
      <div className="p-4"><div aria-live="polite" className="mb-3 text-sm font-semibold text-[#34413b]">{monthLabel}</div><div className="grid grid-cols-7 text-center">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => <span className="pb-2 text-[10px] font-semibold uppercase text-[#87928b]" key={weekday}>{weekday}</span>)}{days.map((day, index) => {
        if (!day) return <span aria-hidden="true" className="aspect-square" key={`empty-${index}`} />;
        const currentDate = new Date(month.getFullYear(), month.getMonth(), day);
        const key = dateKey(currentDate);
        const count = tasksByDay[key]?.length || 0;
        const isSelected = selectedDate === key;
        const isToday = todayKey === key;
        return <button aria-label={`${new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(currentDate)}${count ? `, ${count} ${count === 1 ? 'task' : 'tasks'} due` : ''}`} aria-pressed={isSelected} className={`relative m-0.5 grid aspect-square place-items-center rounded-lg text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] ${isSelected ? 'bg-[#e8e1f8] font-bold text-[#5e47a4]' : isToday ? 'font-bold text-[#5e47a4] hover:bg-[#f3f0fa]' : 'text-[#536159] hover:bg-[#f3f6f3]'}`} key={key} onClick={() => setSelectedDate(key)} type="button"><span>{day}</span>{isToday && <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-[#8b6de0]" />}{count > 0 && <span aria-hidden="true" className={`absolute right-1 top-1 size-1.5 rounded-full ${isSelected ? 'bg-[#7254bd]' : 'bg-[#bf7951]'}`} />}</button>;
      })}</div>
        <div className="mt-4 border-t border-[#edf0ed] pt-3"><p className="mb-2 text-xs font-semibold text-[#526159]">{selectedTasks.length ? `${selectedTasks.length} ${selectedTasks.length === 1 ? 'task' : 'tasks'} due` : calendarTasks.length ? 'No tasks due this day' : 'No upcoming deadlines'}</p>{selectedTasks.length ? <div className="grid gap-1.5">{selectedTasks.slice(0, 3).map((task) => <Link className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#46534b] hover:bg-[#f3f6f3]" key={task.id || task._id} to={`/projects/${task.projectId || task.project?.id || task.project?._id}?tab=tasks`}><CircleCheck aria-hidden="true" className="shrink-0 text-[#66836f]" size={13} /><span className="min-w-0 flex-1 truncate">{task.title}</span><span className="max-w-20 truncate text-[10px] text-[#87928b]">{task.projectName || task.project?.name}</span></Link>)}</div> : <p className="text-[11px] text-[#87928b]">{calendarTasks.length ? 'Select a marked date to see its tasks.' : 'Tasks with due dates will appear on this calendar.'}</p>}</div>
      </div>
    </section>
  );
}
