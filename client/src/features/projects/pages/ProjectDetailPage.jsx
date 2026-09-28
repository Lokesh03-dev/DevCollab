import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import GitHubRepositoryPanel from '../components/GitHubRepositoryPanel.jsx';
import ProjectActivityFeed from '../components/ProjectActivityFeed.jsx';
import ProjectChat from '../components/ProjectChat.jsx';
import ProjectMemberList from '../../../components/projects/ProjectMemberList.jsx';
import TaskBoard from '../../../components/tasks/TaskBoard.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { createTaskComment, getTaskComments } from '../../comments/services/commentService.js';
import { deleteProject, getProject, removeProjectMember, updateProject } from '../services/projectService.js';
import { sendProjectInvitation } from '../services/invitationService.js';
import { createTask, deleteTask, getProjectTasks, updateTask } from '../../tasks/services/taskService.js';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'code', label: 'Code' },
  { id: 'chat', label: 'Chat' },
  { id: 'github', label: 'GitHub' },
  { id: 'activity', label: 'Activity' },
  { id: 'members', label: 'Members' },
];

const statuses = ['planning', 'active', 'completed'];
const CodeEditorWorkspace = lazy(() => import('../components/CodeEditorWorkspace.jsx'));

function getId(value) {
  return typeof value === 'string' ? value : value?.id || value?._id;
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [dialog, setDialog] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [inviteEmail, setInviteEmail] = useState('');
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: 'planning', technologies: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
  const activeTab = tabs.some((tab) => tab.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';

  useEffect(() => {
    const taskId = getId(selectedTask);
    if (!taskId) {
      setTaskComments([]);
      setCommentDraft('');
      setCommentError('');
      return undefined;
    }

    let active = true;
    setIsLoadingComments(true);
    setCommentError('');
    getTaskComments(taskId)
      .then((result) => { if (active) setTaskComments(result.data.comments || []); })
      .catch((requestError) => { if (active) setCommentError(requestError.response?.data?.message || 'Unable to load task comments.'); })
      .finally(() => { if (active) setIsLoadingComments(false); });
    return () => { active = false; };
  }, [selectedTask]);

  useEffect(() => {
    let active = true;

    if (!/^[a-f\d]{24}$/i.test(id || '')) {
      setError('This project link is invalid.');
      setIsLoading(false);
      return () => { active = false; };
    }

    async function loadWorkspace() {
      setIsLoading(true);
      setError('');

      try {
        const [projectResult, taskResult] = await Promise.all([getProject(id), getProjectTasks(id)]);
        if (active) {
          setProject(projectResult.data.project);
          setTasks(taskResult.data.tasks);
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to load this project.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadWorkspace();
    return () => { active = false; };
  }, [id, reloadKey]);

  if (isLoading) {
    return <div className="rounded-xl border border-[#e1e7e1] bg-white p-8"><LoadingSpinner label="Loading project" /></div>;
  }

  if (error || !project) {
    return <section className="rounded-xl border border-[#e1e7e1] bg-white p-8 text-center"><h2 className="font-display text-xl font-semibold text-[#26332d]">{error || 'Project not found.'}</h2><Link className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#d7dfd8] bg-white px-4 py-2 text-sm font-semibold text-[#34413b]" to="/projects">Back to projects</Link></section>;
  }

  const ownerId = getId(project.owner);
  const isOwner = ownerId === user?.id;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  async function runAction(action) {
    setIsSaving(true);
    setActionError('');
    setActionSuccess('');

    try {
      await action();
      setDialog('');
      setReloadKey((key) => key + 1);
      return true;
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to complete this action.');
      showToast('Unable to complete that project action. The error will remain visible until dismissed.', 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function openEditDialog() {
    setProjectForm({
      name: project.name,
      description: project.description || '',
      status: project.status,
      technologies: (project.technologies || []).join(', '),
    });
    setActionError('');
    setDialog('edit');
  }

  async function handleEdit(event) {
    event.preventDefault();
    await runAction(() => updateProject(id, {
      name: projectForm.name,
      description: projectForm.description,
      status: projectForm.status,
      technologies: projectForm.technologies.split(',').map((item) => item.trim()).filter(Boolean),
    }));
  }

  async function handleInvite(event) {
    event.preventDefault();
    const invited = await runAction(() => sendProjectInvitation(id, inviteEmail.trim()));
    if (invited) {
      setInviteEmail('');
      setActionSuccess('Invitation sent. The recipient can accept it from their invitations.');
    }
  }

  async function handleRemoveMember(member) {
    await runAction(() => removeProjectMember(id, getId(member)));
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    const created = await runAction(() => createTask(id, {
      ...taskForm,
      assignedTo: taskForm.assignedTo || null,
      dueDate: taskForm.dueDate || null,
    }));
    if (created) setTaskForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
  }

  async function handleTaskStatus(task, status) {
    await runAction(() => updateTask(getId(task), { status }));
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!text || !selectedTask) return;
    setIsPostingComment(true);
    setCommentError('');
    try {
      const result = await createTaskComment(getId(selectedTask), text);
      setTaskComments((current) => [...current, result.data.comment]);
      setCommentDraft('');
    } catch (requestError) {
      setCommentError(requestError.response?.data?.message || 'Unable to post your comment.');
    } finally {
      setIsPostingComment(false);
    }
  }

  async function handleDeleteTask(task) {
    await runAction(() => deleteTask(getId(task)));
  }

  async function handleDeleteProject() {
    const deleted = await runAction(() => deleteProject(id));
    if (deleted) navigate('/projects', { replace: true });
  }

  return (
    <div className="animate-lift-in space-y-6">
      <Link className="text-sm font-semibold text-[#28664c] hover:underline" to="/projects">&lt;- All projects</Link>
      <section className="rounded-xl border border-[#d9e3da] bg-[#e8f0e8] p-6 md:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="max-w-2xl"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold capitalize text-[#4d6d58]">{project.status}</span><span className="text-xs text-[#75867a]">Owned by {project.owner?.name || 'Unknown'}</span></div><h2 className="font-display mt-3 text-3xl font-semibold text-[#263b2e]">{project.name}</h2><p className="mt-2 text-sm leading-6 text-[#65786a]">{project.description || 'No project description yet.'}</p></div>
          {isOwner && <div className="flex flex-wrap gap-2"><Button onClick={() => { setActionError(''); setDialog('invite'); }} variant="secondary">Invite member</Button><Button onClick={openEditDialog} variant="secondary">Edit project</Button><Button onClick={() => { setActionError(''); setDialog('delete-project'); }} variant="ghost">Delete</Button></div>}
        </div>
        <div className="mt-7 flex flex-wrap gap-2">{project.technologies?.map((technology) => <span className="rounded-md border border-[#cfdbd0] bg-white/70 px-2.5 py-1 text-xs font-medium text-[#4d6d58]" key={technology}>{technology}</span>)}</div>
      </section>

      <nav aria-label="Project sections" className="scrollbar-hidden flex gap-1 overflow-x-auto border-b border-[#dce4dc]" role="tablist">
        {tabs.map((tab) => <button aria-selected={activeTab === tab.id} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-[#347253] text-[#28664c]' : 'border-transparent text-[#7b877f] hover:text-[#34413b]'}`} key={tab.id} onClick={() => setSearchParams(tab.id === 'overview' ? {} : { tab: tab.id })} role="tab" type="button">{tab.label}</button>)}
      </nav>

      {actionError && <p className="rounded-lg border border-[#e7c9c1] bg-[#fff7f4] px-4 py-3 text-sm text-[#984b3c]" role="alert">{actionError}</p>}
      {actionSuccess && <p className="rounded-lg border border-[#c9dfcf] bg-[#eff7f0] px-4 py-3 text-sm text-[#3c704f]" role="status">{actionSuccess}</p>}

      {activeTab === 'overview' && <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <article className="rounded-xl border border-[#e1e7e1] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#7e8c83]">Project progress</p><p className="font-display mt-1 text-2xl font-semibold text-[#26332d]">{progress}%</p></div><p className="text-xs text-[#87928b]">{completedCount} of {tasks.length} tasks complete</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf1ed]"><div className="h-full rounded-full bg-[#4c8c6d] transition-[width]" style={{ width: `${progress}%` }} /></div></article>
          <article className="rounded-xl border border-[#e1e7e1] bg-white p-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-semibold text-[#26332d]">Recent tasks</h3><button className="text-xs font-semibold text-[#28664c] hover:underline" onClick={() => setSearchParams({ tab: 'tasks' })} type="button">View all</button></div>{tasks.slice(0, 4).map((task) => <div className="border-t border-[#edf0ed] py-2 first:border-0" key={getId(task)}><span className="text-xs capitalize text-[#87928b]">{task.status.replace('-', ' ')}</span><p className="text-sm font-medium text-[#34413b]">{task.title}</p></div>)}{tasks.length === 0 && <p className="text-sm text-[#87928b]">No project tasks yet.</p>}</article>
        </div>
        <article className="rounded-xl border border-[#e1e7e1] bg-white p-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-semibold text-[#26332d]">Team members</h3><button className="text-xs font-semibold text-[#28664c] hover:underline" onClick={() => setSearchParams({ tab: 'members' })} type="button">Manage</button></div><ProjectMemberList canManage={false} members={project.members} ownerId={ownerId} /></article>
      </section>}

      {activeTab === 'tasks' && <section className="space-y-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#7e8c83]">Project work</p><h3 className="font-display mt-1 text-xl font-semibold text-[#26332d]">Task board</h3></div><Button onClick={() => { setActionError(''); setDialog('task'); }}>New task <span aria-hidden="true">+</span></Button></div><TaskBoard onDelete={handleDeleteTask} onOpen={setSelectedTask} onStatusChange={handleTaskStatus} tasks={tasks} /></section>}

      {activeTab === 'members' && <section className="max-w-3xl rounded-xl border border-[#e1e7e1] bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#7e8c83]">People</p><h3 className="font-display mt-1 text-xl font-semibold text-[#26332d]">Project members</h3></div>{isOwner && <Button onClick={() => { setActionError(''); setDialog('invite'); }} variant="secondary">Invite member</Button>}</div><ProjectMemberList canManage={isOwner} members={project.members} onRemove={handleRemoveMember} ownerId={ownerId} /></section>}

      {activeTab === 'code' && <Suspense fallback={<div className="rounded-xl border border-[#e1e7e1] bg-white p-8"><LoadingSpinner label="Loading code workspace" /></div>}><CodeEditorWorkspace members={project.members} projectId={id} /></Suspense>}
      {activeTab === 'chat' && <ProjectChat projectId={id} />}
      {activeTab === 'github' && <GitHubRepositoryPanel currentUser={user} project={project} projectId={id} />}
      {activeTab === 'activity' && <ProjectActivityFeed projectId={id} />}

      <Modal className="max-w-xl" onClose={() => setSelectedTask(null)} open={Boolean(selectedTask)} title={selectedTask?.title || 'Task details'}>
        {selectedTask && <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eaf1eb] px-2.5 py-1 text-xs font-semibold capitalize text-[#3c704f]">{selectedTask.status?.replace('-', ' ')}</span><span className="rounded-full bg-[#f1f4f1] px-2.5 py-1 text-xs font-semibold capitalize text-[#647168]">{selectedTask.priority || 'medium'} priority</span></div>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-[#849088]">Description</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#536159]">{selectedTask.description || 'No description provided.'}</p></div>
          <div className="grid gap-4 border-t border-[#edf0ed] pt-4 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#849088]">Assigned to</p><p className="mt-1 text-sm text-[#34413b]">{selectedTask.assignedTo?.name || 'Unassigned'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-[#849088]">Due date</p><p className="mt-1 text-sm text-[#34413b]">{selectedTask.dueDate ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(selectedTask.dueDate)) : 'No due date'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-[#849088]">Created by</p><p className="mt-1 text-sm text-[#34413b]">{selectedTask.createdBy?.name || 'Unknown'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-[#849088]">Last updated</p><p className="mt-1 text-sm text-[#34413b]">{selectedTask.updatedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(selectedTask.updatedAt)) : 'Not available'}</p></div></div>
          <section aria-label="Task comments" className="border-t border-[#edf0ed] pt-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-[#34413b]">Comments</h3><span className="text-xs text-[#87928b]">{taskComments.length}</span></div>{isLoadingComments ? <p className="py-3 text-xs text-[#87928b]">Loading comments…</p> : taskComments.length ? <div className="mb-4 max-h-48 space-y-3 overflow-y-auto">{taskComments.map((comment) => <article className="rounded-lg bg-[#f7f9f7] p-3" key={getId(comment)}><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[#34413b]">{comment.user?.name || 'Project member'}</p><time className="text-[10px] text-[#87928b]" dateTime={comment.createdAt}>{comment.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(comment.createdAt)) : ''}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#536159]">{comment.text}</p></article>)}</div> : <p className="mb-4 text-xs text-[#87928b]">No comments yet. Start the task conversation.</p>}
            {commentError && <p className="mb-3 text-xs text-[#a84436]" role="alert">{import.meta.env.DEV ? commentError : 'Unable to load or post comments.'}</p>}
            <form className="grid gap-2" onSubmit={handleCommentSubmit}><label className="sr-only" htmlFor="task-comment">Write a comment</label><textarea className="min-h-20 resize-y rounded-lg border border-[#d7dfd8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#54866e] focus:ring-3 focus:ring-[#dcebe1]" id="task-comment" maxLength={5000} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Add a comment…" value={commentDraft} /><div className="flex justify-end"><Button disabled={!commentDraft.trim() || isPostingComment} type="submit">{isPostingComment ? 'Posting…' : 'Comment'}</Button></div></form>
          </section>
          <div className="flex justify-end"><Button onClick={() => setSelectedTask(null)} variant="secondary">Close</Button></div>
        </div>}
      </Modal>

      <Modal onClose={() => setDialog('')} open={dialog === 'edit'} title="Edit project">
        <form className="grid gap-4" onSubmit={handleEdit}><Input autoFocus label="Project name" maxLength={100} name="edit-name" onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} required value={projectForm.name} /><label className="grid gap-1.5 text-sm font-medium text-[#34413b]">Description<textarea className="min-h-24 rounded-lg border border-[#d7dfd8] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#54866e] focus:ring-3 focus:ring-[#dcebe1]" maxLength={2000} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} value={projectForm.description} /></label><label className="grid gap-1.5 text-sm font-medium text-[#34413b]">Status<select className="min-h-11 rounded-lg border border-[#d7dfd8] bg-white px-3 text-sm" onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value }))} value={projectForm.status}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><Input label="Technologies" name="edit-technologies" onChange={(event) => setProjectForm((current) => ({ ...current, technologies: event.target.value }))} value={projectForm.technologies} />{actionError && <p className="text-sm text-[#a84436]" role="alert">{actionError}</p>}<div className="flex justify-end gap-2"><Button onClick={() => setDialog('')} variant="secondary">Cancel</Button><Button disabled={isSaving} type="submit">Save changes</Button></div></form>
      </Modal>

      <Modal onClose={() => setDialog('')} open={dialog === 'invite'} title="Invite a project member">
        <form className="grid gap-4" onSubmit={handleInvite}><Input autoComplete="email" autoFocus hint="They need an existing DevCollab account to receive the invitation." label="Email address" name="invite-email" onChange={(event) => setInviteEmail(event.target.value)} required type="email" value={inviteEmail} />{actionError && <p className="text-sm text-[#a84436]" role="alert">{actionError}</p>}<div className="flex justify-end gap-2"><Button onClick={() => setDialog('')} variant="secondary">Cancel</Button><Button disabled={isSaving} type="submit">{isSaving ? 'Sending…' : 'Send invitation'}</Button></div></form>
      </Modal>

      <Modal onClose={() => setDialog('')} open={dialog === 'task'} title="Create a task">
        <form className="grid gap-4" onSubmit={handleCreateTask}><Input autoFocus label="Title" maxLength={200} name="task-title" onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} required value={taskForm.title} /><label className="grid gap-1.5 text-sm font-medium text-[#34413b]">Description<textarea className="min-h-20 rounded-lg border border-[#d7dfd8] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#54866e] focus:ring-3 focus:ring-[#dcebe1]" onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} value={taskForm.description} /></label><label className="grid gap-1.5 text-sm font-medium text-[#34413b]">Assign to<select className="min-h-11 rounded-lg border border-[#d7dfd8] bg-white px-3 text-sm" onChange={(event) => setTaskForm((current) => ({ ...current, assignedTo: event.target.value }))} value={taskForm.assignedTo}><option value="">Unassigned</option>{project.members.map((member) => <option key={getId(member)} value={getId(member)}>{member.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-[#34413b]">Priority<select className="min-h-11 rounded-lg border border-[#d7dfd8] bg-white px-3 text-sm" onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))} value={taskForm.priority}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><Input label="Due date" name="task-due-date" onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} type="date" value={taskForm.dueDate} /></div>{actionError && <p className="text-sm text-[#a84436]" role="alert">{actionError}</p>}<div className="flex justify-end gap-2"><Button onClick={() => setDialog('')} variant="secondary">Cancel</Button><Button disabled={isSaving} type="submit">Create task</Button></div></form>
      </Modal>

      <Modal onClose={() => setDialog('')} open={dialog === 'delete-project'} title="Delete project">
        <p className="text-sm text-[#68766e]">Delete {project.name} and its project record? This cannot be undone.</p>
        {actionError && <p className="mt-3 text-sm text-[#a84436]" role="alert">{actionError}</p>}
        <div className="mt-6 flex justify-end gap-2"><Button onClick={() => setDialog('')} variant="secondary">Cancel</Button><Button disabled={isSaving} onClick={handleDeleteProject} className="bg-[#a84436] hover:bg-[#8e382d]">Delete project</Button></div>
      </Modal>
    </div>
  );
}