import { io } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { getAuthToken } from '../../../lib/authToken.js';
import { SOCKET_ORIGIN } from '../../../lib/api.js';
import { getProjectMessages } from '../services/messageService.js';

function messageId(message) {
  return message.id || message._id;
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export default function ProjectChat({ projectId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    let active = true;
    getProjectMessages(projectId)
      .then((result) => {
        if (active) setMessages(result.data.messages);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load project messages.');
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
      socket.emit('chat:join', { projectId });
    });
    socket.on('disconnect', () => {
      setIsConnected(false);
      setOnlineUsers([]);
    });
    socket.on('connect_error', (connectionError) => {
      setIsConnected(false);
      setError(connectionError.message || 'Unable to connect to project chat.');
    });
    socket.on('chat:error', (event) => setError(event.message));
    socket.on('chat:presence', ({ users }) => setOnlineUsers(users));
    socket.on('chat:member-left', ({ userId }) => setOnlineUsers((current) => current.filter((member) => member.id !== userId)));
    socket.on('chat:message', ({ message }) => {
      setMessages((current) => current.some((item) => messageId(item) === messageId(message)) ? current : [...current, message]);
    });

    return () => {
      socket.emit('chat:leave', { projectId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function handleSend(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !socketRef.current?.connected || isSending) return;

    setIsSending(true);
    setError('');
    socketRef.current.timeout(10000).emit('chat:send', { projectId, message: text }, (timeoutError, result) => {
      setIsSending(false);

      if (timeoutError) {
        setError('Message could not be sent. Check your connection and try again.');
        return;
      }

      if (!result?.success) {
        setError(result?.message || 'Message could not be sent.');
        return;
      }

      setMessages((current) => current.some((item) => messageId(item) === messageId(result.data.message)) ? current : [...current, result.data.message]);
      setDraft('');
    });
  }

  return (
    <section className="grid min-h-140 overflow-hidden rounded-xl border border-[#e1e7e1] bg-white lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="flex min-h-140 min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[#e7ece7] px-4 py-3 md:px-5">
          <div><p className="font-display text-base font-semibold text-[#26332d]">Project chat</p><p className="mt-0.5 text-xs text-[#7e8c83]">Messages are visible to project members.</p></div>
          <span className={`inline-flex items-center gap-1.5 text-xs ${isConnected ? 'text-[#347253]' : 'text-[#9b6b39]'}`}><span className={`size-2 rounded-full ${isConnected ? 'bg-[#5caa76]' : 'bg-[#d7a46d]'}`} />{isConnected ? 'Connected' : 'Connecting'}</span>
        </header>

        {error && <div className="border-b border-[#efddd8] bg-[#fff7f4] px-4 py-2 text-sm text-[#984b3c]" role="alert">{error}</div>}

        <div aria-label="Project messages" aria-live="polite" className="scrollbar-hidden flex-1 space-y-4 overflow-y-auto bg-[#fbfcfa] p-4 md:p-5" role="log">
          {isLoading ? <div className="grid min-h-48 place-items-center"><LoadingSpinner label="Loading messages" /></div> : messages.length === 0 ? <div className="grid min-h-48 place-items-center text-center"><div><p className="font-display text-lg font-semibold text-[#34413b]">Start the conversation</p><p className="mt-1 text-sm text-[#87928b]">Share a decision, update, or question with the team.</p></div></div> : messages.map((message) => {
            const sender = message.sender;
            const isOwnMessage = (sender?.id || sender?._id) === user?.id;
            return (
              <article className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`} key={messageId(message)}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e8eee9] text-[10px] font-bold text-[#41624d]">{sender?.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'}</span>
                <div className={`min-w-0 max-w-[82%] ${isOwnMessage ? 'text-right' : ''}`}>
                  <div className={`mb-1 flex items-baseline gap-2 ${isOwnMessage ? 'justify-end' : ''}`}><span className="text-xs font-semibold text-[#34413b]">{isOwnMessage ? 'You' : sender?.name || 'Project member'}</span><time className="text-[10px] text-[#9aa49d]" dateTime={message.createdAt}>{formatTime(message.createdAt)}</time></div>
                  <p className={`inline-block whitespace-pre-wrap wrap-break-word rounded-xl px-3.5 py-2.5 text-left text-sm leading-5 ${isOwnMessage ? 'rounded-tr-sm bg-[#e7f0e8] text-[#294d3c]' : 'rounded-tl-sm bg-white text-[#3d4942] ring-1 ring-[#e8ede8]'}`}>{message.message}</p>
                </div>
              </article>
            );
          })}
          <div ref={endOfMessagesRef} />
        </div>

        <form className="flex items-end gap-2 border-t border-[#e7ece7] bg-white p-3 md:p-4" onSubmit={handleSend}>
          <label className="sr-only" htmlFor="project-chat-message">Write a message</label>
          <textarea className="max-h-32 min-h-11 flex-1 resize-y rounded-lg border border-[#d7dfd8] bg-white px-3.5 py-3 text-sm text-[#202a27] outline-none placeholder:text-[#9aa59e] focus:border-[#54866e] focus:ring-3 focus:ring-[#dcebe1] disabled:bg-[#f4f6f3]" disabled={!isConnected || isSending} id="project-chat-message" maxLength={4000} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} placeholder={isConnected ? 'Write a message…' : 'Connecting to chat…'} value={draft} />
          <Button disabled={!draft.trim() || !isConnected || isSending} type="submit">{isSending ? 'Sending…' : 'Send'}</Button>
        </form>
      </div>

      <aside aria-label="Online project members" className="border-t border-[#e7ece7] bg-[#f8faf7] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between border-b border-[#e7ece7] px-4 py-3"><h3 className="text-xs font-bold uppercase tracking-widest text-[#66756c]">Online now</h3><span className="rounded-full bg-[#e7f0e8] px-2 py-0.5 text-[10px] font-semibold text-[#347253]">{onlineUsers.length}</span></div>
        <div className="grid gap-2 p-3">{onlineUsers.map((member) => <div className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2" key={member.id}><span className="size-2 shrink-0 rounded-full bg-[#5caa76]" /><span className="truncate text-sm text-[#46534b]">{member.id === user?.id ? `${member.name} (you)` : member.name}</span></div>)}{onlineUsers.length === 0 && <p className="px-2 py-3 text-xs text-[#87928b]">No members online.</p>}</div>
      </aside>
    </section>
  );
}