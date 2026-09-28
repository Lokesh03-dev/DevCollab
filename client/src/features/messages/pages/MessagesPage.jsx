import { io } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageSquareText, Plus, Search, Send, UserRound } from 'lucide-react';
import Button from '../../../components/ui/Button.jsx';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import { getAuthToken } from '../../../lib/authToken.js';
import { SOCKET_ORIGIN } from '../../../lib/api.js';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { getDirectConversations, getDirectMessages, searchPeople } from '../services/directMessageService.js';

function getId(value) {
  return typeof value === 'string' ? value : value?.id || value?._id;
}

function getInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [joinedUserId, setJoinedUserId] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [isMobileConversationOpen, setIsMobileConversationOpen] = useState(false);
  const socketRef = useRef(null);
  const activeUserRef = useRef(null);
  const messageEndRef = useRef(null);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    let active = true;
    getDirectConversations().then((result) => {
      if (active) setConversations(result.data.conversations || []);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load direct messages.');
    }).finally(() => {
      if (active) setIsLoadingInbox(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!searchOpen || peopleQuery.trim().length < 2) {
      setPeopleResults([]);
      setIsSearching(false);
      return undefined;
    }

    let active = true;
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);
      searchPeople(peopleQuery.trim()).then((result) => {
        if (active) setPeopleResults(result.data.users || []);
      }).catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to search people.');
      }).finally(() => {
        if (active) setIsSearching(false);
      });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchOpen, peopleQuery]);

  useEffect(() => {
    const socket = io(SOCKET_ORIGIN, { auth: { token: getAuthToken() } });
    socketRef.current = socket;

    function joinConversation(person) {
      const userId = getId(person);
      if (!userId || !socket.connected) return;
      socket.timeout(10000).emit('dm:join', { userId }, (timeoutError, result) => {
        if (timeoutError || !result?.success) {
          if (activeUserRef.current && getId(activeUserRef.current) === userId) {
            setError(result?.message || 'Unable to connect to this conversation.');
          }
          return;
        }
        if (activeUserRef.current && getId(activeUserRef.current) === userId) setJoinedUserId(userId);
      });
    }

    socket.on('connect', () => {
      setIsConnected(true);
      if (activeUserRef.current) joinConversation(activeUserRef.current);
    });
    socket.on('disconnect', () => {
      setIsConnected(false);
      setJoinedUserId('');
    });
    socket.on('connect_error', () => {
      setIsConnected(false);
      setError('Live messaging is unavailable. Check the server connection.');
    });
    socket.on('dm:message', ({ message }) => {
      const selectedId = getId(activeUserRef.current);
      const senderId = getId(message.sender);
      const recipientId = getId(message.recipient);
      const currentUserId = getId(user);
      const peerId = senderId === currentUserId ? recipientId : senderId;
      if (selectedId && selectedId === peerId) {
        setMessages((current) => current.some((item) => getId(item) === getId(message)) ? current : [...current, message]);
      }
      setConversations((current) => {
        const peer = senderId === currentUserId ? message.recipient : message.sender;
        const peerIdForList = getId(peer);
        if (!peerIdForList) return current;
        const existing = current.filter((conversation) => getId(conversation.user) !== peerIdForList);
        return [{ user: peer, lastMessage: message }, ...existing];
      });
    });

    return () => {
      const selectedId = getId(activeUserRef.current);
      if (selectedId) socket.emit('dm:leave', { userId: selectedId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    const userId = getId(activeUser);
    activeUserRef.current = activeUser;
    setMessages([]);
    setDraft('');
    setJoinedUserId('');
    setError('');
    if (!userId) return undefined;

    const sequence = ++requestSequenceRef.current;
    setIsLoadingMessages(true);
    getDirectMessages(userId).then((result) => {
      if (sequence === requestSequenceRef.current) setMessages(result.data.messages || []);
    }).catch((requestError) => {
      if (sequence === requestSequenceRef.current) setError(requestError.response?.data?.message || 'Unable to load this conversation.');
    }).finally(() => {
      if (sequence === requestSequenceRef.current) setIsLoadingMessages(false);
    });

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.timeout(10000).emit('dm:join', { userId }, (timeoutError, result) => {
        if (timeoutError || !result?.success) {
          setError(result?.message || 'Unable to connect to this conversation.');
          return;
        }
        if (getId(activeUserRef.current) === userId) setJoinedUserId(userId);
      });
    }

    return () => {
      requestSequenceRef.current += 1;
      if (socket?.connected) socket.emit('dm:leave', { userId });
    };
  }, [activeUser]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  function openConversation(person) {
    const previousId = getId(activeUserRef.current);
    if (previousId && previousId !== getId(person) && socketRef.current?.connected) {
      socketRef.current.emit('dm:leave', { userId: previousId });
    }
    activeUserRef.current = person;
    setActiveUser(person);
    setIsMobileConversationOpen(true);
    setSearchOpen(false);
    setPeopleQuery('');
    setError('');
  }

  function handleSend(event) {
    event.preventDefault();
    const userId = getId(activeUser);
    const message = draft.trim();
    if (!userId || !message || !socketRef.current?.connected || joinedUserId !== userId) return;

    setError('');
    socketRef.current.timeout(10000).emit('dm:send', { userId, message }, (timeoutError, result) => {
      if (timeoutError || !result?.success) {
        setError(result?.message || 'Message could not be sent. Try again.');
        return;
      }
      const savedMessage = result.data.message;
      setMessages((current) => current.some((item) => getId(item) === getId(savedMessage)) ? current : [...current, savedMessage]);
      setConversations((current) => [{ user: activeUser, lastMessage: savedMessage }, ...current.filter((item) => getId(item.user) !== userId)]);
      setDraft('');
    });
  }

  const activeId = getId(activeUser);

  return (
    <div className="animate-lift-in space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c83]">Workspace</p><h1 className="font-display mt-1 text-3xl font-semibold text-[#26332d]">Messages</h1><p className="mt-2 text-sm text-[#748078]">Private conversations with DevCollab members.</p></div><Button onClick={() => { setSearchOpen(true); setPeopleQuery(''); setError(''); setIsMobileConversationOpen(false); }}><Plus aria-hidden="true" size={16} />New message</Button></header>
      {error && <p className="rounded-lg border border-[#efddd8] bg-[#fff7f4] px-4 py-2 text-sm text-[#984b3c]" role="alert">{import.meta.env.DEV ? error : 'Unable to complete this messaging action.'}</p>}
      <section className="grid min-h-[min(70vh,680px)] overflow-hidden rounded-xl border border-[#e1e7e1] bg-white lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside aria-label="Direct message conversations" className={`${isMobileConversationOpen ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col border-b border-[#e7ece7] lg:border-b-0 lg:border-r`}>
          <div className="flex items-center justify-between border-b border-[#edf0ed] px-4 py-3"><h2 className="text-sm font-semibold text-[#34413b]">Direct messages</h2><button aria-label="New message" className="grid size-8 place-items-center rounded-md text-[#5e47a3] hover:bg-[#f1eef7]" onClick={() => { setSearchOpen(true); setPeopleQuery(''); }} title="New message" type="button"><Plus size={17} /></button></div>
          {searchOpen && <div className="border-b border-[#edf0ed] p-3"><label className="sr-only" htmlFor="people-search">Search people by name or email</label><div className="flex items-center gap-2 rounded-lg border border-[#dedbe7] px-3"><Search aria-hidden="true" className="shrink-0 text-[#7e8c83]" size={15} /><input autoFocus className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#90909a]" id="people-search" onChange={(event) => setPeopleQuery(event.target.value)} placeholder="Search name or email" value={peopleQuery} /><button aria-label="Close people search" className="text-xs text-[#777580] hover:text-[#17151d]" onClick={() => setSearchOpen(false)} type="button">Esc</button></div><div className="mt-2 max-h-52 overflow-y-auto">{peopleQuery.trim().length < 2 ? <p className="px-2 py-2 text-xs text-[#7e8c83]">Enter at least two characters.</p> : isSearching ? <p className="px-2 py-2 text-xs text-[#7e8c83]">Searching people…</p> : peopleResults.length ? peopleResults.map((person) => <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-[#f5f3fa]" key={getId(person)} onClick={() => openConversation(person)} type="button"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e8e1f8] text-[10px] font-bold text-[#5e47a3]">{getInitials(person.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-medium text-[#26332d]">{person.name}</span><span className="block truncate text-xs text-[#7e8c83]">{person.email}</span></span></button>) : <p className="px-2 py-2 text-xs text-[#7e8c83]">No people found.</p>}</div></div>}
          <div className="min-h-0 flex-1 overflow-y-auto">{isLoadingInbox ? <div className="grid min-h-36 place-items-center"><LoadingSpinner label="Loading messages" /></div> : conversations.length ? conversations.map((conversation) => <button aria-current={getId(conversation.user) === activeId ? 'true' : undefined} className={`flex w-full items-start gap-3 border-b border-[#f0eef3] px-4 py-3 text-left transition-colors ${getId(conversation.user) === activeId ? 'bg-[#f1eef7]' : 'hover:bg-[#faf9fc]'}`} key={getId(conversation.user)} onClick={() => openConversation(conversation.user)} type="button"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8e1f8] text-[10px] font-bold text-[#5e47a3]">{getInitials(conversation.user?.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#26332d]">{conversation.user?.name || conversation.user?.email}</span><span className="mt-1 block truncate text-xs text-[#7e8c83]">{conversation.lastMessage?.message}</span></span><time className="shrink-0 pt-0.5 text-[10px] text-[#91909a]">{formatTime(conversation.lastMessage?.createdAt)}</time></button>) : <div className="grid min-h-48 place-items-center px-5 text-center"><div><span className="mx-auto grid size-10 place-items-center rounded-lg bg-[#f1eef7] text-[#5e47a3]"><MessageSquareText aria-hidden="true" size={18} /></span><p className="mt-3 text-sm font-semibold text-[#34413b]">No messages yet</p><p className="mt-1 text-xs text-[#7e8c83]">Start a private conversation with a teammate.</p><button className="mt-3 text-xs font-semibold text-[#5e47a3] hover:underline" onClick={() => setSearchOpen(true)} type="button">Find someone</button></div></div>}</div>
        </aside>

        <section aria-label={activeUser ? `Conversation with ${activeUser.name}` : 'Conversation'} className={`${isMobileConversationOpen ? 'flex' : 'hidden lg:flex'} min-h-[70vh] min-w-0 flex-col`}>
          {activeUser ? <>
            <header className="flex items-center gap-3 border-b border-[#e7ece7] px-4 py-3"><button aria-label="Back to conversations" className="grid size-8 place-items-center rounded-md text-[#68766e] hover:bg-[#f1eef7] lg:hidden" onClick={() => setIsMobileConversationOpen(false)} type="button"><ArrowLeft size={17} /></button><span className="grid size-9 place-items-center rounded-full bg-[#e8e1f8] text-[10px] font-bold text-[#5e47a3]">{getInitials(activeUser.name)}</span><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-[#26332d]">{activeUser.name}</h2><p className="truncate text-xs text-[#7e8c83]">{activeUser.email}</p></div><span className="ml-auto flex items-center gap-1.5 text-xs text-[#7e8c83]"><span className={`size-2 rounded-full ${isConnected ? 'bg-[#4d9a68]' : 'bg-[#bd9250]'}`} />{isConnected ? 'Connected' : 'Connecting'}</span></header>
            <div aria-label="Direct messages" aria-live="polite" className="flex-1 space-y-4 overflow-y-auto bg-[#fbfafc] p-4 md:p-6" role="log">{isLoadingMessages ? <div className="grid min-h-48 place-items-center"><LoadingSpinner label="Loading conversation" /></div> : messages.length ? messages.map((message) => {
              const senderId = getId(message.sender);
              const isOwn = senderId !== activeId;
              return <article className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`} key={getId(message)}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e8e1f8] text-[10px] font-bold text-[#5e47a3]">{getInitials(message.sender?.name)}</span><div className={`min-w-0 max-w-[82%] ${isOwn ? 'text-right' : ''}`}><div className={`mb-1 flex items-center gap-2 ${isOwn ? 'justify-end' : ''}`}><span className="text-xs font-semibold text-[#34413b]">{isOwn ? 'You' : message.sender?.name}</span><time className="text-[10px] text-[#91909a]" dateTime={message.createdAt}>{formatTime(message.createdAt)}</time></div><p className={`inline-block whitespace-pre-wrap wrap-break-word rounded-xl px-3.5 py-2.5 text-left text-sm leading-5 ${isOwn ? 'rounded-tr-sm bg-[#e8e1f8] text-[#241d35]' : 'rounded-tl-sm bg-white text-[#30303a] ring-1 ring-[#e7e4ed]'}`}>{message.message}</p></div></article>;
            }) : <div className="grid min-h-48 place-items-center text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-[#f1eef7] text-[#5e47a3]"><UserRound aria-hidden="true" size={19} /></span><p className="mt-3 text-sm font-semibold text-[#34413b]">Start the conversation</p><p className="mt-1 text-xs text-[#7e8c83]">Send a private message to {activeUser.name}.</p></div></div>}<div ref={messageEndRef} /></div>
            <form className="flex items-end gap-2 border-t border-[#e7ece7] bg-white p-3 md:p-4" onSubmit={handleSend}><label className="sr-only" htmlFor="direct-message-draft">Write a direct message</label><textarea className="max-h-32 min-h-11 flex-1 resize-y rounded-lg border border-[#d7dfd8] bg-white px-3.5 py-3 text-sm text-[#202a27] outline-none placeholder:text-[#9aa59e] focus:border-[#8d74c9] focus:ring-3 focus:ring-[#ece6f8] disabled:bg-[#f4f6f3]" disabled={!isConnected || joinedUserId !== activeId} id="direct-message-draft" maxLength={4000} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} placeholder={joinedUserId === activeId ? 'Write a message…' : 'Connecting to conversation…'} value={draft} /><Button disabled={!draft.trim() || !isConnected || joinedUserId !== activeId} type="submit" aria-label="Send message"><Send aria-hidden="true" size={16} /><span className="hidden sm:inline">Send</span></Button></form>
          </> : <div className="grid flex-1 place-items-center px-6 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#f1eef7] text-[#5e47a3]"><MessageSquareText aria-hidden="true" size={21} /></span><h2 className="font-display mt-4 text-lg font-semibold text-[#34413b]">Choose a conversation</h2><p className="mt-1 text-sm text-[#7e8c83]">Start a private chat by searching for a person.</p><Button className="mt-4" onClick={() => { setSearchOpen(true); setIsMobileConversationOpen(false); }}><Plus aria-hidden="true" size={15} />New message</Button></div></div>}
        </section>
      </section>
    </div>
  );
}
