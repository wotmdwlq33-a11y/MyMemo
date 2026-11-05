import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Toast } from '../hooks/useToast';

type Props = { toast: Toast | null; onDismiss: () => void };

/**
 * Bottom toast. The two live regions stay mounted so screen readers announce
 * new messages: info toasts go to role=status, errors to role=alert.
 */
export default function ToastRegion({ toast, onDismiss }: Props) {
  const renderToast = () =>
    toast && (
      <motion.div
        key={toast.text}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`pointer-events-auto max-w-md flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm ${
          toast.kind === 'error'
            ? 'bg-rose-600 text-white'
            : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
        }`}
      >
        <span className="flex-1">{toast.text}</span>
        {toast.action && (
          <button
            type="button"
            onClick={toast.action.run}
            className="font-semibold text-indigo-300 hover:text-indigo-200 dark:text-indigo-600 dark:hover:text-indigo-700 whitespace-nowrap"
          >
            {toast.action.label}
          </button>
        )}
        <button type="button" onClick={onDismiss} aria-label="알림 닫기" className="opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      </motion.div>
    );

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <div role="status" aria-live="polite" className="contents">
        {toast?.kind !== 'error' && renderToast()}
      </div>
      <div role="alert" className="contents">
        {toast?.kind === 'error' && renderToast()}
      </div>
    </div>
  );
}
