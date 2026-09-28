import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectCard from '../../../components/projects/ProjectCard.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import { useToast } from '../../toasts/context/ToastContext.jsx';
import { createProject, getProjects } from '../services/projectService.js';

const filters = [
  { value: 'all', label: 'All projects' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({ name: '', description: '', technologies: '', status: 'planning', startDate: '', endDate: '' });

  useEffect(() => {
    let active = true;

    getProjects()
      .then((result) => {
        if (active) setProjects(result.data.projects);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load projects.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [reloadKey]);

  const visibleProjects = useMemo(() => projects.filter((project) => {
    const matchesFilter = activeFilter === 'all' || project.status === activeFilter;
    const matchesQuery = `${project.name} ${project.description} ${project.technologies.join(' ')}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  }), [projects, activeFilter, query]);

  async function handleCreate(event) {
    event.preventDefault();
    setIsCreating(true);
    setFormError('');

    try {
      const result = await createProject({
        name: form.name,
        description: form.description,
        technologies: form.technologies.split(',').map((item) => item.trim()).filter(Boolean),
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      const project = result.data.project;
      const projectId = project.id || project._id;
      if (!projectId) {
        setFormError('The project was created, but its workspace link could not be loaded.');
        return;
      }
      setIsModalOpen(false);
      setForm({ name: '', description: '', technologies: '', status: 'planning', startDate: '', endDate: '' });
      showToast('Project created successfully.');
      navigate(`/projects/${projectId}`);
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'Unable to create this project.');
      showToast('Unable to create project.', 'error');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="animate-lift-in space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c83]">Shared work</p>
          <h2 className="font-display mt-1 text-3xl font-semibold text-[#26332d]">Projects</h2>
          <p className="mt-2 text-sm text-[#748078]">A clear view of what the team is moving forward.</p>
        </div>
        <Button onClick={() => { setFormError(''); setIsModalOpen(true); }}>New project <span aria-hidden="true">+</span></Button>
      </section>
      <section className="flex flex-col gap-4 rounded-xl border border-[#e1e7e1] bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div aria-label="Filter projects" className="scrollbar-hidden flex gap-1 overflow-x-auto" role="group">
          {filters.map((filter) => <button aria-pressed={activeFilter === filter.value} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${activeFilter === filter.value ? 'bg-[#e7f0e8] text-[#28664c]' : 'text-[#77847b] hover:bg-[#f3f6f3]'}`} key={filter.value} onClick={() => setActiveFilter(filter.value)} type="button">{filter.label}</button>)}
        </div>
        <div className="w-full md:max-w-65"><Input aria-label="Search projects" name="project-search" onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" value={query} /></div>
      </section>
      {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e7c9c1] bg-[#fff7f4] px-4 py-3" role="alert"><p className="text-sm text-[#984b3c]">{error}</p><button className="text-sm font-semibold text-[#984b3c] underline" onClick={() => { setError(''); setIsLoading(true); setReloadKey((key) => key + 1); }} type="button">Retry</button></div>}
      {isLoading ? <div className="rounded-xl border border-[#e1e7e1] bg-white p-8"><LoadingSpinner label="Loading projects" /></div> : visibleProjects.length ? <section aria-label="Projects" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleProjects.map((project) => <ProjectCard key={project.id || project._id} project={project} />)}</section> : <div className="rounded-xl border border-dashed border-[#cfd9d0] bg-white/70 p-12 text-center"><p className="font-display text-lg font-semibold text-[#34413b]">{projects.length ? 'No matching projects' : 'No projects yet'}</p><p className="mt-1 text-sm text-[#7d8981]">{projects.length ? 'Try another search or status filter.' : 'Create a project to get your team started.'}</p></div>}

      <Modal onClose={() => setIsModalOpen(false)} open={isModalOpen} title="Create a project">
        <form className="grid gap-4" onSubmit={handleCreate}>
          <Input autoFocus label="Project name" maxLength={100} name="name" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required value={form.name} />
          <div className="grid gap-4 sm:grid-cols-2"><Input label="Start date" name="startDate" onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} required type="date" value={form.startDate} /><Input label="End date" min={form.startDate || undefined} name="endDate" onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} required type="date" value={form.endDate} /></div>
          <label className="grid gap-1.5 text-sm font-medium text-[#34413b]">Description<textarea className="min-h-24 rounded-lg border border-[#d7dfd8] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#54866e] focus:ring-3 focus:ring-[#dcebe1]" maxLength={2000} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} /></label>
          <Input hint="Separate technologies with commas." label="Technologies" name="technologies" onChange={(event) => setForm((current) => ({ ...current, technologies: event.target.value }))} placeholder="React, Node.js, MongoDB" value={form.technologies} />
          <label className="grid gap-1.5 text-sm font-medium text-[#34413b]" htmlFor="project-status">Status<select className="min-h-11 rounded-lg border border-[#d7dfd8] bg-white px-3 text-sm outline-none focus:border-[#54866e] focus:ring-3 focus:ring-[#dcebe1]" id="project-status" onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} value={form.status}><option value="planning">Planning</option><option value="active">Active</option><option value="completed">Completed</option></select></label>
          {formError && <p className="text-sm text-[#a84436]" role="alert">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2"><Button onClick={() => setIsModalOpen(false)} variant="secondary">Cancel</Button><Button disabled={isCreating} type="submit">{isCreating ? 'Creating…' : 'Create project'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}