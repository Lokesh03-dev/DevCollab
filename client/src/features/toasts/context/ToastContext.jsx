import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

const ToastContext = createContext(null);
const ERROR_TOASTS_STORAGE_KEY = 'devcollab:error-toasts';

function getPersistedErrors() {
  try {
    const storedToasts = JSON.parse(sessionStorage.getItem(ERROR_TOASTS_STORAGE_KEY) || '[]');
    return Array.isArray(storedToasts)
      ? storedToasts.filter((toast) => toast?.type === 'error' && typeof toast.message === 'string' && toast.id)
      : [];
  } catch {
    return [];
  }
}

function persistErrors(errors) {
  try {
    sessionStorage.setItem(ERROR_TOASTS_STORAGE_KEY, JSON.stringify(errors));
  } catch {
    return;
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState(getPersistedErrors);
  const timers = useRef(new Map());

  function dismissToast(id) {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    persistErrors(getPersistedErrors().filter((toast) => toast.id !== id));
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function showToast(message, type = 'success') {
    const id = `${Date.now()}-${Math.random()}`;
    const toast = { id, message, type };
    if (type === 'error') {
      const storedErrors = getPersistedErrors();
      if (storedErrors.some((item) => item.message === message)) return;
      persistErrors([...storedErrors, toast]);
    }
    setToasts((current) => type === 'error' && current.some((item) => item.type === 'error' && item.message === message)
      ? current
      : [...current, toast]);
    if (type !== 'error') timers.current.set(id, window.setTimeout(() => dismissToast(id), 4500));
  }

  useEffect(() => {
    persistErrors(toasts.filter((toast) => toast.type === 'error'));
  }, [toasts]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div aria-label="Notifications" className="pointer-events-none fixed bottom-4 right-4 z-70 grid w-[min(360px,calc(100vw-2rem))] gap-2" role="region">
        {toasts.map((toast) => {
          const Icon = toast.type === 'error' ? CircleAlert : CircleCheck;
          return <div className="animate-lift-in pointer-events-auto flex items-center gap-3 rounded-lg border border-[#e1e7e1] bg-white px-4 py-3 shadow-[0_12px_36px_rgba(16,18,24,0.2)]" key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'}><Icon aria-hidden="true" className={toast.type === 'error' ? 'shrink-0 text-[#c65f58]' : 'shrink-0 text-[#8c74d8]'} size={18} /><p className="min-w-0 flex-1 text-sm text-[#34413b]">{toast.message}</p><button aria-label="Dismiss notification" className="grid size-7 shrink-0 place-items-center rounded-md text-[#7b877f] hover:bg-[#f1f4f1]" onClick={() => dismissToast(toast.id)} type="button"><X size={15} /></button></div>;
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider.');
  return context;
}
