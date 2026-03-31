import { useState, useCallback } from 'react';

let _id = 0;

export function useToast(duration = 3000) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg, type = 'info') => {
    const id = ++_id;
    setToasts(t => {
      // Deduplicate same message
      if (t.some(x => x.msg === msg)) return t;
      return [...t.slice(-4), { id, msg, type }]; // max 5 toasts
    });
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, [duration]);

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  return { toasts, show, dismiss };
}
