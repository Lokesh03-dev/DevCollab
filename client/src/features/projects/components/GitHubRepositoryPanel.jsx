import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import { connectProjectGitHub, getProjectGitHub } from '../services/githubService.js';

function getId(value) {
  return value?.id || value?._id;
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function GitHubRepositoryPanel({ projectId, project, currentUser }) {
  const [summary, setSummary] = useState(null);
  const [repositoryInput, setRepositoryInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const isOwner = getId(project.owner) === currentUser?.id;

  useEffect(() => {
    let active = true;

    getProjectGitHub(projectId)
      .then((result) => {
        if (active) setSummary(result.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load repository information.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [projectId]);

  async function handleConnect(event) {
    event.preventDefault();
    setError('');
    setIsConnecting(true);

    try {
      const result = await connectProjectGitHub(projectId, repositoryInput.trim());
      setSummary(result.data);
      setRepositoryInput('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to connect this repository.');
    } finally {
      setIsConnecting(false);
    }
  }

  if (isLoading) return <div className="rounded-xl border border-[#e1e7e1] bg-white p-8"><LoadingSpinner label="Loading GitHub repository" /></div>;

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c83]">Repository connection</p><h3 className="font-display mt-1 text-xl font-semibold text-[#26332d]">GitHub</h3><p className="mt-1 text-sm text-[#748078]">Read-only repository details and recent commits.</p></div>
        {summary?.repository && <a className="text-sm font-semibold text-[#28664c] hover:underline" href={summary.repository.url} rel="noreferrer" target="_blank">Open on GitHub <span aria-hidden="true">↗</span></a>}
      </header>

      {error && <p className="rounded-lg border border-[#e7c9c1] bg-[#fff7f4] px-4 py-3 text-sm text-[#984b3c]" role="alert">{error}</p>}

      {!summary?.repository ? (
        <section className="max-w-xl rounded-xl border border-dashed border-[#cfd9d0] bg-white p-6">
          <p className="font-display text-lg font-semibold text-[#34413b]">No repository connected</p>
          <p className="mt-1 text-sm text-[#7d8981]">Connect a public repository using its owner/repository name.</p>
          {isOwner ? <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleConnect}><div className="min-w-0 flex-1"><Input autoComplete="off" label="Repository" name="github-repository" onChange={(event) => setRepositoryInput(event.target.value)} placeholder="owner/repository" required value={repositoryInput} /></div><Button disabled={isConnecting} type="submit">{isConnecting ? 'Connecting…' : 'Connect repository'}</Button></form> : <p className="mt-4 text-xs text-[#87928b]">Only the project owner can connect a repository.</p>}
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-[#e1e7e1] bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold text-[#7e8c83]">{summary.repository.fullName}</p><h4 className="font-display mt-1 text-xl font-semibold text-[#26332d]">{summary.repository.description || summary.repository.fullName}</h4></div><span className="rounded-md bg-[#edf3ee] px-2.5 py-1 text-xs font-semibold text-[#466451]">{summary.repository.defaultBranch}</span></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3"><article className="rounded-lg bg-[#f7f9f7] p-3"><p className="text-xs text-[#7d8981]">Stars</p><p className="font-display mt-1 text-xl font-semibold text-[#34413b]">{summary.repository.stars.toLocaleString()}</p></article><article className="rounded-lg bg-[#f7f9f7] p-3"><p className="text-xs text-[#7d8981]">Forks</p><p className="font-display mt-1 text-xl font-semibold text-[#34413b]">{summary.repository.forks.toLocaleString()}</p></article><article className="rounded-lg bg-[#f7f9f7] p-3"><p className="text-xs text-[#7d8981]">Open issues</p><p className="font-display mt-1 text-xl font-semibold text-[#34413b]">{summary.repository.openIssues.toLocaleString()}</p></article></div>
          </section>
          <section className="rounded-xl border border-[#e1e7e1] bg-white">
            <header className="border-b border-[#edf0ed] px-5 py-4"><h4 className="font-display font-semibold text-[#26332d]">Recent commits</h4></header>
            {summary.commits.length ? <div className="divide-y divide-[#edf0ed]">{summary.commits.map((commit) => <a className="block px-5 py-4 transition-colors hover:bg-[#f8faf7]" href={commit.url} key={commit.sha} rel="noreferrer" target="_blank"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="min-w-0 flex-1 truncate text-sm font-medium text-[#34413b]">{commit.message}</p><span className="font-mono text-[10px] text-[#66756c]">{commit.shortSha}</span></div><p className="mt-1 text-xs text-[#87928b]">{commit.author} · {formatDate(commit.authoredAt)}</p></a>)}</div> : <p className="px-5 py-6 text-sm text-[#87928b]">No recent commits.</p>}
          </section>
        </>
      )}
    </section>
  );
}