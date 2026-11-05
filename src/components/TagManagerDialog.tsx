import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Pencil, Tag as TagIcon, Trash2, X } from 'lucide-react';
import { useFocusTrap } from '../lib/useFocusTrap';

type Props = {
  tags: [string, number][];
  onRename: (from: string, to: string) => void;
  onDelete: (tag: string) => void;
  onClose: () => void;
  returnFocusTo?: RefObject<HTMLElement | null>;
};

/** Rename (or merge) and delete tags across all notes. */
export default function TagManagerDialog({ tags, onRename, onDelete, onClose, returnFocusTo }: Props) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, returnFocusTo);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing) return;
      // First Escape cancels an inline rename, the next closes the dialog.
      if (editing !== null) setEditing(null);
      else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editing, onClose]);

  const commit = (from: string) => {
    const to = draft.trim();
    if (!to || to === from) {
      setEditing(null);
      return;
    }
    if (to.includes(',')) return;
    const existing = tags.some(([t]) => t === to);
    if (existing && !window.confirm(`'${to}' 태그가 이미 있습니다. 두 태그를 합칠까요?`)) return;
    onRename(from, to);
    setEditing(null);
  };

  const invalid = draft.includes(',');
  const iconButton = 'p-1.5 rounded-lg text-slate-500 dark:text-slate-400 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-heading`}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="relative w-full max-w-md max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-3xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id={`${id}-heading`}
            className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2"
          >
            <TagIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
            태그 관리
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          이름을 바꾸면 모든 메모에 반영되고, 같은 이름의 태그가 있으면 하나로 합쳐집니다. 태그를 삭제해도 메모는
          남습니다.
        </p>
        {tags.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">태그가 없습니다.</p>
        ) : (
          <ul className="overflow-y-auto -mx-2 px-2 space-y-1">
            {tags.map(([tag, count]) => (
              <li
                key={tag}
                className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                {editing === tag ? (
                  <form
                    className="flex-1 flex items-center gap-2"
                    onSubmit={e => {
                      e.preventDefault();
                      commit(tag);
                    }}
                  >
                    <input
                      autoFocus
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      aria-label={`'${tag}' 태그의 새 이름`}
                      aria-invalid={invalid}
                      className="flex-1 min-w-0 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-lg outline-none text-sm"
                    />
                    <button
                      type="submit"
                      disabled={invalid}
                      aria-label="이름 저장"
                      className={`${iconButton} hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-40`}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      aria-label="이름 변경 취소"
                      className={`${iconButton} hover:bg-slate-100 dark:hover:bg-slate-800`}
                    >
                      <X size={16} />
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                      #{tag}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(tag);
                        setDraft(tag);
                      }}
                      aria-label={`'${tag}' 태그 이름 바꾸기`}
                      className={`${iconButton} hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`'${tag}' 태그를 메모 ${count}개에서 삭제할까요? 메모는 지워지지 않습니다.`))
                          onDelete(tag);
                      }}
                      aria-label={`'${tag}' 태그 삭제`}
                      className={`${iconButton} hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {invalid && (
          <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
            태그 이름에는 쉼표를 쓸 수 없습니다.
          </p>
        )}
      </motion.div>
    </div>
  );
}
