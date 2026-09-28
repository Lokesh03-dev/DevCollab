import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, BriefcaseBusiness, CheckSquare, Search, UsersRound } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { getProjects } from '../../features/projects/services/projectService.js';
import { getProjectCodeFiles } from '../../features/projects/services/codeFileService.js';
import { getProjectMessages } from '../../features/projects/services/messageService.js';
import { getProjectTasks } from '../../features/tasks/services/taskService.js';

function getId(value) {
  return typeof value === 'string' ? value : value?.id || value?._id;
}

function readRecentSearches() {
  try {
    return JSON.parse(sessionStorage.getItem('devcollab:recent-searches') || '[]');
  } catch {
    return [];
  }
}

export default function WorkspaceSearch({ open, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [workspace, setWorkspace] = useState({ projects: [], tasks: [], members: [], files: [], messages: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setIsLoading(true);
    setError('');

    getProjects().then(async (result) => {
      const projects = result.data.projects || [];
      const validProjects = projects.filter((project) => /^[a-f\d]{24}$/i.test(getId(project) || ''));
      const projectResults = await Promise.all(validProjects.map(async (project) => {
        const [taskResult, fileResult, messageResult] = await Promise.allSettled([
          getProjectTasks(getId(project)),
          getProjectCodeFiles(getId(project)),
          getProjectMessages(getId(project)),
        ]);
        return { project, taskResult, fileResult, messageResult };
      }));
      const tasks = projectResults.flatMap(({ project, taskResult }) => taskResult.status === 'fulfilled'
        ? (taskResult.value.data.tasks || []).map((task) => ({ ...task, projectName: project.name, projectId: getId(project) }))
        : []);
      const files = projectResults.flatMap(({ project, fileResult }) => fileResult.status === 'fulfilled'
        ? (fileResult.value.data.codeFiles || []).map((file) => ({ ...file, projectName: project.name, projectId: getId(project) }))
        : []);
      const messages = projectResults.flatMap(({ project, messageResult }) => messageResult.status === 'fulfilled'
        ? (messageResult.value.data.messages || []).map((message) => ({ ...message, projectName: project.name, projectId: getId(project) }))
        : []);
      const membersById = new Map();
      for (const project of projects) {
        for (const member of project.members || []) {
          if (typeof member === 'string') continue;
          const id = getId(member);
          if (id && !membersById.has(id)) membersById.set(id, { ...member, projectId: getId(project) });
        }
      }
      if (active) {
        setWorkspace({ projects, tasks, members: [...membersById.values()], files, messages });
        if (projectResults.some(({ taskResult, fileResult, messageResult }) => taskResult.status === 'rejected' || fileResult.status === 'rejected' || messageResult.status === 'rejected')) {
          setError('Some workspace content could not be searched.');
        }
      }
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to search your workspace.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    return () => { active = false; };
  }, [open, retryKey]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    const matches = (value) => value.toLowerCase().includes(normalizedQuery);
    return [
      ...workspace.projects.filter((project) => matches(`${project.name} ${project.description || ''} ${(project.technologies || []).join(' ')}`)).map((project) => ({
        id: `project-${getId(project)}`, type: 'Projects', label: project.name, detail: project.description || project.status, Icon: BriefcaseBusiness, projectId: getId(project), tab: 'overview',
      })),
      ...workspace.tasks.filter((task) => matches(`${task.title} ${task.description || ''} ${task.projectName}`)).map((task) => ({
        id: `task-${getId(task)}`, type: 'Tasks', label: task.title, detail: task.projectName, Icon: CheckSquare, projectId: task.projectId, tab: 'tasks',
      })),
      ...workspace.members.filter((member) => matches(`${member.name || ''} ${member.email || ''}`)).map((member) => ({
        id: `member-${getId(member)}`, type: 'Team members', label: member.name || 'Member', detail: member.email || '', Icon: UsersRound, projectId: member.projectId, tab: 'members',
      })),
      ...workspace.files.filter((file) => matches(`${file.fileName || ''} ${file.path || ''} ${file.projectName}`)).map((file) => ({
        id: `file-${getId(file)}`, type: 'Files', label: file.path || file.fileName, detail: file.projectName, Icon: BriefcaseBusiness, projectId: file.projectId, tab: 'code',
      })),
      ...workspace.messages.filter((message) => matches(`${message.message || ''} ${message.sender?.name || ''} ${message.projectName}`)).map((message) => ({
        id: `message-${getId(message)}`, type: 'Messages', label: message.message || '', detail: `${message.sender?.name || 'Project member'} · ${message.projectName}`, Icon: Search, projectId: message.projectId, tab: 'chat',
      })),
    ];
  }, [query, workspace]);

  function selectResult(result) {
    const nextRecent = [query.trim(), ...recentSearches.filter((item) => item !== query.trim())].slice(0, 5);
    sessionStorage.setItem('devcollab:recent-searches', JSON.stringify(nextRecent));
    setRecentSearches(nextRecent);
    onClose();
    if (result.projectId) navigate(`/projects/${result.projectId}${result.tab === 'overview' ? '' : `?tab=${result.tab}`}`);
  }

  function handleInputKeyDown(event) {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    }
  }

  return (
    <Modal className="max-w-2xl overflow-hidden p-0" onClose={onClose} open={open} title="Search DevCollab">
      <div className="flex items-center gap-3 border-b border-[#e7ece7] px-5 py-3">
        <Search aria-hidden="true" className="shrink-0 text-[#75847a]" size={18} />
        <input
          aria-label="Search projects, tasks, and team members"
          autoFocus
          className="min-h-9 min-w-0 flex-1 bg-transparent text-sm text-[#26332d] outline-none placeholder:text-[#9aa49d]"
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={handleInputKeyDown}
          placeholder="Search projects, tasks, members, files, and messages"
          ref={inputRef}
          value={query}
        />
        <kbd className="rounded border border-[#e2e8e2] px-1.5 py-0.5 text-[10px] text-[#849088]">ESC</kbd>
      </div>
      <div className="max-h-[min(60vh,440px)] overflow-y-auto p-3">
        {error && <div className="flex items-center justify-between rounded-lg bg-[#fff7f4] px-3 py-2 text-xs text-[#984b3c]" role="alert"><span>{import.meta.env.DEV ? error : 'Unable to search the workspace.'}</span><button className="font-semibold underline" onClick={() => setRetryKey((key) => key + 1)} type="button">Try again</button></div>}
        {!query.trim() && <div className="px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#849088]">Recent searches</p>{recentSearches.length ? <div className="mt-2 grid gap-1">{recentSearches.map((item) => <button className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[#59675f] hover:bg-[#f3f6f3]" key={item} onClick={() => setQuery(item)} type="button"><Search size={14} />{item}</button>)}</div> : <p className="mt-2 text-xs text-[#8c9790]">Your recent searches will appear here.</p>}</div>}
        {query.trim() && isLoading && <p className="px-3 py-8 text-center text-sm text-[#849088]">Searching your workspace…</p>}
        {query.trim() && !isLoading && !error && results.length === 0 && <p className="px-3 py-8 text-center text-sm text-[#849088]">No results for “{query.trim()}”.</p>}
        {query.trim() && !isLoading && results.length > 0 && <div className="grid gap-3">{['Projects', 'Tasks', 'Team members', 'Files', 'Messages'].map((type) => {
          const group = results.filter((result) => result.type === type);
          if (!group.length) return null;
          return <section aria-label={type} key={type}><h3 className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#849088]">{type}</h3><div className="grid gap-0.5">{group.map((result) => {
            const resultIndex = results.findIndex((item) => item.id === result.id);
            return <button aria-selected={resultIndex === activeIndex} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${resultIndex === activeIndex ? 'bg-[#eaf1eb]' : 'hover:bg-[#f5f7f5]'}`} key={result.id} onClick={() => selectResult(result)} onMouseEnter={() => setActiveIndex(resultIndex)} type="button"><span className="grid size-8 place-items-center rounded-md bg-white text-[#52715e]"><result.Icon size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[#334139]">{result.label}</span><span className="mt-0.5 block truncate text-xs text-[#849088]">{result.detail}</span></span></button>;
          })}</div></section>;
        })}</div>}
      </div>
      <footer className="flex items-center gap-4 border-t border-[#e7ece7] px-5 py-2.5 text-[10px] text-[#849088]"><span className="inline-flex items-center gap-1"><ArrowUp size={12} /><ArrowDown size={12} /> Navigate</span><span>Enter to open</span></footer>
    </Modal>
  );
}
