import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import { Expand, Minimize } from 'lucide-react';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import { getAuthToken } from '../../../lib/authToken.js';
import { SOCKET_ORIGIN } from '../../../lib/api.js';
import { useTheme } from '../../theme/context/ThemeContext.jsx';
import {
  createCodeFile,
  deleteCodeFile,
  getCodeFile,
  getProjectCodeFiles,
  updateCodeFile,
} from '../services/codeFileService.js';

const languages = ['javascript', 'typescript', 'jsx', 'tsx', 'json', 'html', 'css', 'python', 'go', 'rust', 'plaintext'];

function getId(value) {
  return value?.id || value?._id;
}

export default function CodeEditorWorkspace({ projectId, members }) {
  const { theme } = useTheme();
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [content, setContent] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingUsers, setEditingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState('Saved');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [fileForm, setFileForm] = useState({ fileName: '', path: '', language: 'javascript' });
  const socketRef = useRef(null);
  const activeFileRef = useRef(null);
  const contentRef = useRef('');
  const workspaceRef = useRef(null);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
    let active = true;

    getProjectCodeFiles(projectId)
      .then((result) => {
        if (!active) return;
        const codeFiles = result.data.codeFiles;
        setFiles(codeFiles);
        if (codeFiles.length) {
          setActiveFile(codeFiles[0]);
          setContent(codeFiles[0].content);
          contentRef.current = codeFiles[0].content;
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load project files.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    const socket = io(SOCKET_ORIGIN, { auth: { token: getAuthToken() } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('code:join', { projectId });
    });
    socket.on('disconnect', () => {
      setIsConnected(false);
      setOnlineUsers([]);
    });
    socket.on('code:presence', ({ users }) => setOnlineUsers(users));
    socket.on('code:update', (update) => {
      if (getId(activeFileRef.current) !== update.fileId) return;
      setContent(update.content);
      contentRef.current = update.content;
      setIsDirty(false);
      setSaveState(`Updated by ${update.user?.name || 'teammate'}`);
    });
    socket.on('code:editing', (event) => {
      setEditingUsers((current) => {
        const withoutUser = current.filter((entry) => entry.user.id !== event.user.id || entry.fileId !== event.fileId);
        return event.isEditing ? [...withoutUser, event] : withoutUser;
      });
    });
    socket.on('code:member-left', ({ userId }) => setOnlineUsers((current) => current.filter((user) => user.id !== userId)));
    socket.on('code:error', (event) => setError(event.message));
    socket.on('connect_error', () => {
      setIsConnected(false);
      setError('Live editing is unavailable. File saving still works.');
    });

    return () => {
      socket.emit('code:leave', { projectId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!activeFile || !isDirty) return undefined;

    const fileId = getId(activeFile);
    const contentToSave = content;
    const timeoutId = window.setTimeout(async () => {
      setSaveState('Saving…');
      try {
        const result = await updateCodeFile(fileId, { content: contentToSave });
        setFiles((current) => current.map((file) => getId(file) === fileId ? result.data.codeFile : file));
        if (contentToSave === contentRef.current) {
          setActiveFile(result.data.codeFile);
          setIsDirty(false);
          setSaveState('Saved');
          socketRef.current?.emit('code:editing', { projectId, fileId, isEditing: false });
        }
      } catch (requestError) {
        setSaveState('Save failed');
        setError(requestError.response?.data?.message || 'Unable to save this file.');
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [activeFile, content, isDirty, projectId]);

  async function openFile(file) {
    setError('');
    try {
      const result = await getCodeFile(getId(file));
      setActiveFile(result.data.codeFile);
      setContent(result.data.codeFile.content);
      contentRef.current = result.data.codeFile.content;
      setIsDirty(false);
      setSaveState('Saved');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to open this file.');
    }
  }

  function handleEditorChange(value) {
    if (!activeFile) return;
    const nextContent = value ?? '';
    setContent(nextContent);
    contentRef.current = nextContent;
    setIsDirty(true);
    setSaveState('Unsaved changes');
    socketRef.current?.emit('code:change', { projectId, fileId: getId(activeFile), content: nextContent });
    socketRef.current?.emit('code:editing', { projectId, fileId: getId(activeFile), isEditing: true });
  }

  async function handleCreateFile(event) {
    event.preventDefault();
    setIsCreating(true);
    setError('');

    try {
      const path = fileForm.path.trim() || fileForm.fileName.trim();
      const result = await createCodeFile(projectId, { ...fileForm, fileName: fileForm.fileName.trim(), path, content: '' });
      setFiles((current) => [...current, result.data.codeFile].sort((left, right) => left.path.localeCompare(right.path)));
      setActiveFile(result.data.codeFile);
      setContent('');
      contentRef.current = '';
      setIsDirty(false);
      setSaveState('Saved');
      setFileForm({ fileName: '', path: '', language: 'javascript' });
      setModalOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create this file.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteFile(file) {
    try {
      await deleteCodeFile(getId(file));
      const remainingFiles = files.filter((item) => getId(item) !== getId(file));
      setFiles(remainingFiles);
      if (getId(activeFile) === getId(file)) {
        setActiveFile(remainingFiles[0] || null);
        setContent(remainingFiles[0]?.content || '');
        contentRef.current = remainingFiles[0]?.content || '';
        setIsDirty(false);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete this file.');
    }
  }

  async function handleSave() {
    if (!activeFile) return;
    const contentToSave = contentRef.current;
    setSaveState('Saving…');

    try {
      const result = await updateCodeFile(getId(activeFile), { content: contentToSave });
      setFiles((current) => current.map((file) => getId(file) === getId(activeFile) ? result.data.codeFile : file));
      if (contentRef.current === contentToSave) {
        setActiveFile(result.data.codeFile);
        setIsDirty(false);
        setSaveState('Saved');
      }
    } catch (requestError) {
      setSaveState('Save failed');
      setError(requestError.response?.data?.message || 'Unable to save this file.');
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await workspaceRef.current?.requestFullscreen();
    } catch {
      setError('Unable to open the editor in full-screen mode.');
    }
  }

  const currentEditors = editingUsers.filter((event) => event.fileId === getId(activeFile));

  if (isLoading) return <div className="rounded-xl border border-[#e1e7e1] bg-white p-8"><LoadingSpinner label="Loading files" /></div>;

  return (
    <section className="overflow-hidden rounded-xl border border-[#29332f] bg-[#1e2522] text-white" ref={workspaceRef}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b8a3f5]">Developer workspace</p><p className="mt-1 text-sm font-medium text-[#e4ebe6]">{activeFile?.path || 'No file open'}</p></div>
        <div className="flex flex-wrap items-center gap-2"><span aria-live="polite" className="text-xs text-[#c4b5fd]">{saveState}</span><Button disabled={!activeFile || !isDirty} onClick={handleSave} variant="secondary">Save</Button><Button onClick={() => { setError(''); setModalOpen(true); }} variant="secondary">New file</Button><button aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'} className="grid size-9 place-items-center rounded-lg border border-white/10 text-[#c7c4d2] hover:bg-white/10 hover:text-white" onClick={toggleFullscreen} title={isFullscreen ? 'Exit full screen' : 'Full screen'} type="button">{isFullscreen ? <Minimize size={16} /> : <Expand size={16} />}</button></div>
      </div>
      {error && <p className="border-b border-white/10 bg-[#4a302c] px-4 py-2 text-sm text-[#ffd1c5]" role="alert">{error}</p>}
      <div className="grid min-h-155 grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)_220px]">
        <aside aria-label="File explorer" className="border-b border-white/10 bg-[#242c28] lg:border-b-0 lg:border-r">
          <div className="border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a6b7ad]">Explorer</div>
          <div className="max-h-48 overflow-y-auto p-2 lg:max-h-142.5">
            {files.map((file) => (
              <div className={`group flex items-center gap-1 rounded-md ${getId(activeFile) === getId(file) ? 'bg-[#35473d]' : 'hover:bg-white/5'}`} key={getId(file)}>
                <button className="min-w-0 flex-1 truncate px-2 py-2 text-left text-xs text-[#d4ded7]" onClick={() => openFile(file)} title={file.path} type="button">{file.path}</button>
                <button aria-label={`Delete ${file.fileName}`} className="px-2 py-2 text-xs text-[#aebdb3] hover:text-[#ffb3a2]" onClick={() => handleDeleteFile(file)} type="button">×</button>
              </div>
            ))}
            {files.length === 0 && <p className="px-2 py-4 text-xs text-[#87968d]">No files yet.</p>}
          </div>
        </aside>

        <div className="flex min-h-105 min-w-0 flex-col">
          <div className="flex h-10 items-center justify-between border-b border-white/10 bg-[#202723] px-3"><span className="truncate text-xs text-[#cbd6ce]">{activeFile?.fileName || 'Editor'}</span><span className="text-[10px] uppercase text-[#87968d]">{activeFile?.language || 'plaintext'}</span></div>
          <div className="min-h-105 flex-1"><Editor height="100%" language={activeFile?.language || 'plaintext'} onChange={handleEditorChange} options={{ automaticLayout: true, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 2 }} theme={theme === 'dark' ? 'vs-dark' : 'light'} value={content} /></div>
          <div className="flex h-7 items-center justify-between border-t border-white/10 bg-[#202723] px-3 text-[10px] text-[#9cacA2]"><span>{activeFile ? `Saved in ${activeFile.path}` : 'Create or select a file to begin'}</span><span>{content.split('\n').length} lines</span></div>
        </div>

        <aside aria-label="Project collaborators" className="border-t border-white/10 bg-[#242c28] lg:border-l lg:border-t-0">
          <div className="border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a6b7ad]">{isConnected ? `Online developers · ${onlineUsers.length}` : 'Presence unavailable'}</div>
          <div className="grid gap-2 p-3">{onlineUsers.map((member) => <div className="flex items-center gap-2 text-xs text-[#d4ded7]" key={member.id}><span className="size-2 rounded-full bg-[#76c38a]" />{member.name}</div>)}{isConnected && onlineUsers.length === 0 && <p className="text-xs text-[#87968d]">No collaborators online.</p>}</div>
          <div className="border-y border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a6b7ad]">Project members</div>
          <div className="grid gap-2 p-3">{members.map((member) => <div className="truncate text-xs text-[#c2cec5]" key={getId(member)}>{member.name}</div>)}</div>
          {currentEditors.length > 0 && <div className="border-t border-white/10 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a6b7ad]">Editing this file</p>{currentEditors.map((event) => <p className="mt-2 text-xs text-[#d4ded7]" key={event.user.id}>{event.user.name}</p>)}</div>}
        </aside>
      </div>

      <Modal onClose={() => setModalOpen(false)} open={modalOpen} title="Create code file">
        <form className="grid gap-4" onSubmit={handleCreateFile}>
          <Input autoFocus label="File name" name="fileName" onChange={(event) => setFileForm((current) => ({ ...current, fileName: event.target.value }))} placeholder="App.jsx" required value={fileForm.fileName} />
          <Input hint="Relative to the project root. Defaults to the file name." label="Path" name="path" onChange={(event) => setFileForm((current) => ({ ...current, path: event.target.value }))} placeholder="src/App.jsx" value={fileForm.path} />
          <label className="grid gap-1.5 text-sm font-medium text-[#34413b]">Language<select className="min-h-11 rounded-lg border border-[#d7dfd8] bg-white px-3 text-sm" onChange={(event) => setFileForm((current) => ({ ...current, language: event.target.value }))} value={fileForm.language}>{languages.map((language) => <option key={language} value={language}>{language}</option>)}</select></label>
          {error && <p className="text-sm text-[#a84436]" role="alert">{error}</p>}
          <div className="flex justify-end gap-2"><Button onClick={() => setModalOpen(false)} variant="secondary">Cancel</Button><Button disabled={isCreating} type="submit">{isCreating ? 'Creating…' : 'Create file'}</Button></div>
        </form>
      </Modal>
    </section>
  );
}