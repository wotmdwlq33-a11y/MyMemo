import { type RefObject, useEffect, useId, useRef } from 'react';
import { ChevronRight, Tag as TagIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Note } from '../lib/notes';
import type { NoteEditor } from '../hooks/useNoteEditor';
import { formatDateTime } from '../lib/format';
import { applyTagSuggestion, suggestTags } from '../lib/tagSuggest';
import { useFocusTrap } from '../lib/useFocusTrap';

const fieldClass =
  'w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-500/20 rounded-xl outline-none transition-all';

type Props = {
  editor: NoteEditor;
  /** The note being edited (undefined when creating, or if it was deleted). */
  editingNote: Note | undefined;
  /** Every tag in use, most frequent first, for suggestions. */
  knownTags: string[];
  returnFocusRef: RefObject<HTMLElement | null>;
};

/**
 * New / edit note modal. Always mounted so the focus trap and Escape handling
 * follow `editor.isOpen` directly while the dialog animates out.
 */
export default function NoteEditorDialog({ editor, editingNote, knownTags, returnFocusRef }: Props) {
  const { isOpen, editingId, title, setTitle, body, setBody, tagsInput, setTagsInput, close, requestClose, save } = editor;
  const fieldId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const tagsFieldRef = useRef<HTMLInputElement>(null);
  useFocusTrap(dialogRef, isOpen, returnFocusRef);

  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  // Close the modal with Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.isComposing) requestCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const tagSuggestions = isOpen ? suggestTags(knownTags, tagsInput) : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={requestClose}
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${fieldId}-heading`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                e.preventDefault();
                save();
              }
            }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 id={`${fieldId}-heading`} className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  {editingId === null ? '새로운 메모 작성' : '메모 수정'}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="닫기"
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor={`${fieldId}-title`} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">제목</label>
                  <input
                    id={`${fieldId}-title`}
                    type="text"
                    autoFocus
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="메모의 제목을 입력하세요"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label htmlFor={`${fieldId}-body`} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">본문</label>
                  <textarea
                    id={`${fieldId}-body`}
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="내용을 자유롭게 적어보세요..."
                    className={`${fieldClass} resize-none`}
                  />
                </div>

                <div>
                  <label htmlFor={`${fieldId}-tags`} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">태그 (쉼표로 구분)</label>
                  <div className="relative group">
                    <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={16} />
                    <input
                      ref={tagsFieldRef}
                      id={`${fieldId}-tags`}
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="예: 업무, 중요, 프로젝트"
                      aria-describedby={tagSuggestions.length > 0 ? `${fieldId}-tag-suggestions` : undefined}
                      className={`${fieldClass} pl-10`}
                    />
                  </div>
                  {tagSuggestions.length > 0 && (
                    <div id={`${fieldId}-tag-suggestions`} className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">기존 태그:</span>
                      {tagSuggestions.map(tag => (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => {
                            setTagsInput(applyTagSuggestion(tagsInput, tag));
                            tagsFieldRef.current?.focus();
                          }}
                          title={`태그 ${tag} 추가`}
                          className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300 transition-colors"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {editingNote && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    작성 {formatDateTime(editingNote.createdAt)} · 수정 {formatDateTime(editingNote.updatedAt)}
                  </p>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={close}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={save}
                  disabled={!title.trim()}
                  title="Ctrl/⌘ + Enter"
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                  <span>메모 저장</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
