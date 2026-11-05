import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { SW_UPDATE_EVENT, activateUpdate, getPendingUpdate, type SwUpdateEvent } from '../registerServiceWorker';

/**
 * Non-blocking "new version ready" card. Shown when registerServiceWorker announces a
 * waiting service worker; sits bottom-left (above the bottom-center toasts on phones).
 */
export default function UpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(getPendingUpdate);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const onUpdate = (event: Event) => {
      setRegistration((event as SwUpdateEvent).detail);
      setDismissed(false);
    };
    window.addEventListener(SW_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(SW_UPDATE_EVENT, onUpdate);
  }, []);

  const visible = registration !== null && !dismissed;

  return (
    <div role="status" aria-live="polite" className="contents">
      {visible && (
        <div className="fixed z-40 left-4 right-4 bottom-20 sm:right-auto sm:bottom-4 sm:w-80 flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-xl text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <RefreshCw size={18} className="shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <span className="flex-1">새 버전이 준비되었습니다</span>
          <button
            type="button"
            disabled={updating}
            onClick={() => {
              setUpdating(true);
              activateUpdate(registration);
            }}
            className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium whitespace-nowrap transition-colors"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="업데이트 알림 닫기"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
