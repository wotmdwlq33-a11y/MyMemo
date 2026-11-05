import { useEffect, useState } from 'react';

export type Toast = {
  kind: 'info' | 'error';
  text: string;
  action?: { label: string; run: () => void };
};

export type SetToast = (toast: Toast | null) => void;

/** A single toast slot. Informational toasts auto-dismiss; errors stay until closed. */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast || toast.kind === 'error') return;
    const t = window.setTimeout(() => setToast(null), toast.action ? 8000 : 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return [toast, setToast] as const;
}
