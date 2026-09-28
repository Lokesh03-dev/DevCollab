import { io } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Bell, CheckCheck, Mail, MessageSquareText, UserRoundPlus, Workflow } from 'lucide-react';
import LoadingSpinner from '../../../components/ui/LoadingSpinner.jsx';
import { getAuthToken } from '../../../lib/authToken.js';
import { SOCKET_ORIGIN } from '../../../lib/api.js';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationService.js';

function notificationId(notification) {
  return notification.id || notification._id;
}

function formatNotificationDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function getNotificationIcon(type) {
  if (type?.includes('invitation')) return Mail;
  if (type?.includes('task')) return Workflow;
  if (type?.includes('comment') || type?.includes('mention')) return MessageSquareText;
  if (type?.includes('member')) return UserRoundPlus;
  if (type?.includes('activity')) return Activity;
  return Bell;
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const knownNotificationIdsRef = useRef(new Set());
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getNotifications()
      .then((result) => {
        if (!active) return;
        setNotifications(result.data.notifications);
        setUnreadCount(result.data.unreadCount);
        knownNotificationIdsRef.current = new Set(result.data.notifications.map(notificationId));
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load notifications.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const socket = io(SOCKET_ORIGIN, { auth: { token: getAuthToken() } });
    socket.on('notification:new', ({ notification }) => {
      const id = notificationId(notification);
      if (knownNotificationIdsRef.current.has(id)) return;
      knownNotificationIdsRef.current.add(id);
      setNotifications((current) => [notification, ...current].slice(0, 50));
      setUnreadCount((count) => count + 1);
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  async function handleNotificationClick(notification) {
    if (!notification.read) {
      try {
        await markNotificationRead(notificationId(notification));
        setNotifications((current) => current.map((item) => notificationId(item) === notificationId(notification) ? { ...item, read: true } : item));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to mark notification as read.');
        return;
      }
    }

    setIsOpen(false);
    if (notification.type === 'project_invitation') {
      navigate('/invitations');
      return;
    }
    const projectId = notification.project?.id || notification.project?._id;
    if (projectId) navigate(`/projects/${projectId}`);
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
      setUnreadCount(0);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to mark notifications as read.');
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="relative grid size-9 place-items-center rounded-lg border border-[#dce4dc] bg-white text-[#536159] transition-colors hover:bg-[#f3f6f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9c9bd]"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <Bell aria-hidden="true" size={17} />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[#bf654c] px-1 py-0.5 text-[9px] font-bold leading-none text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && <section aria-label="Notifications" className="absolute right-0 top-12 z-50 flex max-h-[min(78vh,560px)] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[#dfe6df] bg-white shadow-[0_16px_48px_rgba(32,42,39,0.18)]" role="dialog">
        <header className="flex items-center justify-between gap-3 border-b border-[#edf0ed] px-4 py-3">
          <div><h2 className="font-display text-base font-semibold text-[#26332d]">Notifications</h2><p className="mt-0.5 text-[11px] text-[#849088]">{unreadCount} unread</p></div>
            <button aria-label="Mark all notifications as read" className="grid size-8 place-items-center rounded-md text-[#28664c] hover:bg-[#f0f5f0] disabled:text-[#aab4ad]" disabled={unreadCount === 0} onClick={handleMarkAllRead} title="Mark all as read" type="button"><CheckCheck size={16} /></button>
        </header>
        {error && <p className="border-b border-[#efddd8] bg-[#fff7f4] px-4 py-2 text-xs text-[#984b3c]" role="alert">{error}</p>}
        <div className="scrollbar-hidden flex-1 overflow-y-auto">
          {isLoading ? <div className="grid min-h-40 place-items-center"><LoadingSpinner label="Loading notifications" /></div> : notifications.length ? notifications.map((notification) => {
            const NotificationIcon = getNotificationIcon(notification.type);
            return <button className={`block w-full border-b border-[#f0f2f0] px-4 py-3 text-left transition-colors hover:bg-[#f8faf7] ${notification.read ? 'bg-white' : 'bg-[#f3f8f3]'}`} key={notificationId(notification)} onClick={() => handleNotificationClick(notification)} type="button">
              <span className="flex items-start gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${notification.read ? 'bg-[#f1f4f1] text-[#7d8981]' : 'bg-[#eaf1eb] text-[#3f7656]'}`}><NotificationIcon aria-hidden="true" size={15} /></span><span className="min-w-0 flex-1"><span className="block text-sm leading-5 text-[#34413b]">{notification.message}</span><span className="mt-1 block text-[10px] text-[#89948d]">{notification.project?.name || 'Workspace'} · {formatNotificationDate(notification.createdAt)}</span></span>{!notification.read && <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-[#4c8c6d]" />}</span>
            </button>;
          }) : <div className="grid min-h-40 place-items-center px-5 text-center"><span className="grid size-10 place-items-center rounded-xl bg-[#f1f4f1] text-[#718278]"><Bell aria-hidden="true" size={18} /></span><p className="mt-2 text-sm font-medium text-[#56645b]">You’re all caught up.</p><p className="mt-1 text-xs text-[#87928b]">New project updates will appear here.</p></div>}
        </div>
      </section>}
    </div>
  );
}