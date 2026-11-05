import { type RefObject, useEffect, useId, useRef } from 'react';
import { useFocusTrap } from '../lib/useFocusTrap';
import { motion } from 'motion/react';
import { Upload, X } from 'lucide-react';
import type { Note } from '../lib/notes';
import type { ImportMode } from '../lib/transfer';

type Props = {
  fileName: string;
  notes: Note[];
  skipped: number;
  existingCount: number;
  onConfirm: (mode: ImportMode) => void;
  onCancel: () => void;
  /** Element to focus again when the dialog closes. */
  returnFocusTo?: RefObject<HTMLElement | null>;
};

/** Ask whether imported notes should be merged into or replace the current list. */
export default function ImportDialog({ fileName, notes, skipped, existingCount, onConfirm, onCancel, returnFocusTo }: Props) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, returnFocusTo);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.isComposing) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-heading`}
        aria-describedby={`${id}-desc`}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-3xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id={`${id}-heading`} className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Upload size={20} className="text-indigo-600 dark:text-indigo-400" />
            메모 가져오기
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="닫기"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div id={`${id}-desc`} className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
          <p>
            <span className="font-semibold text-slate-800 dark:text-slate-200 break-all">{fileName}</span>에서{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">{notes.length}개</strong>의 메모를 찾았습니다.
            {skipped > 0 && <> 형식이 올바르지 않은 {skipped}개 항목은 건너뜁니다.</>}
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>병합</strong>: 새 메모는 추가하고, 같은 메모는 더 최근에 수정된 쪽을 남깁니다.
            </li>
            <li>
              <strong>모두 바꾸기</strong>: 현재 메모 {existingCount}개를 지우고 가져온 메모로 대체합니다.
            </li>
          </ul>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm('replace')}
            className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold rounded-xl transition-colors"
          >
            모두 바꾸기
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => onConfirm('merge')}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            병합
          </button>
        </div>
      </motion.div>
    </div>
  );
}
