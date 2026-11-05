/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useId, useRef, useCallback, type ChangeEvent } from 'react';
import {
  Plus,
  Search,
  Tag as TagIcon,
  X,
  Layers,
  ChevronRight,
  Archive,
  Download,
  Upload,
  Sun,
  Moon,
  Monitor,
  ArrowUpDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  type Note,
  getBrowserStorage,
  loadNotes,
  parseTags,
  saveNotes,
} from './lib/notes';
import { type SortKey, type View, SORT_LABELS, countTags, queryNotes } from './lib/search';
import { type ImportMode, applyImport, exportFileName, exportNotes, parseImport } from './lib/transfer';
import {
  type ThemePref,
  applyTheme,
  loadThemePref,
  nextThemePref,
  resolveTheme,
  saveThemePref,
} from './lib/theme';
import NoteCard from './components/NoteCard';
import ImportDialog from './components/ImportDialog';

const seedTime = new Date().toISOString();
const seed = (id: number, title: string, body: string, tags: string[]): Note => ({
  id,
  title,
  body,
  tags,
  createdAt: seedTime,
  updatedAt: seedTime,
  pinned: false,
  archived: false,
});

const SEED_DATA: Note[] = [
  seed(1, '시안 작업 가이드', '디자인 시스템을 준수하여 피그마 시안을 작업하는 방법론 정리.', ['디자인', '가이드']),
  seed(2, '읽어야 할 책 리스트', '클린 코드, 리팩터링, 테크니컬 라이팅 실전 가이드.', ['독서', '자기개발']),
  seed(3, '프로젝트 아이디어', 'AI 기반의 개인 메모 관리 시스템 및 일기 자동 생성 서비스.', ['업무', '개발']),
];

const SORT_KEY = 'mymemo.sort';
const THEME_LABELS: Record<ThemePref, string> = { system: '시스템', light: '라이트', dark: '다크' };
const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

type Toast = { kind: 'info' | 'error'; text: string };
type PendingImport = { fileName: string; notes: Note[]; skipped: number };

function loadSort(): SortKey {
  try {
    const v = getBrowserStorage()?.getItem(SORT_KEY);
    return v === 'created' || v === 'title' || v === 'updated' ? v : 'updated';
  } catch {
    return 'updated';
  }
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(getBrowserStorage(), SEED_DATA));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<View>('active');
  const [sort, setSort] = useState<SortKey>(loadSort);
  const [themePref, setThemePref] = useState<ThemePref>(() => loadThemePref(getBrowserStorage()));
  const [systemDark, setSystemDark] = useState(prefersDark);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  // null = creating a new note; otherwise the id of the note being edited
  const [editingId, setEditingId] = useState<number | null>(null);
  const fieldId = useId();

  // Single source of persistence: every change to `notes` (including the
  // initial seed and deleting the last note) is written to storage here.
  const saveFailed = useRef(false);
  useEffect(() => {
    const ok = saveNotes(getBrowserStorage(), notes);
    if (!ok && !saveFailed.current) {
      setToast({ kind: 'error', text: '브라우저 저장소에 저장하지 못했습니다. 공간이 부족하거나 저장소가 차단되었을 수 있어요. 내보내기로 백업해 두세요.' });
    }
    saveFailed.current = !ok;
  }, [notes]);

  useEffect(() => {
    try {
      getBrowserStorage()?.setItem(SORT_KEY, sort);
    } catch {
      // Ignore: sort order simply won't persist.
    }
  }, [sort]);

  // Theme: follow prefers-color-scheme unless the user picked one explicitly.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const theme = resolveTheme(themePref, systemDark);
  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);
  const cycleTheme = () => {
    const next = nextThemePref(themePref);
    setThemePref(next);
    saveThemePref(getBrowserStorage(), next);
  };

  // Auto-dismiss informational toasts; errors stay until closed.
  useEffect(() => {
    if (!toast || toast.kind === 'error') return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
    setTitle('');
    setBody('');
    setTagsInput('');
  }, []);

  // Close the modal with Escape.
  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, closeModal]);

  const activeCount = useMemo(() => notes.filter(n => !n.archived).length, [notes]);
  const archivedCount = notes.length - activeCount;

  const allTags = useMemo(
    () => countTags(notes.filter(n => n.archived === (view === 'archived'))),
    [notes, view],
  );

  // Drop selected tags that no longer exist in the current view.
  useEffect(() => {
    setSelectedTags(prev => {
      const next = prev.filter(t => allTags.some(([tag]) => tag === t));
      return next.length === prev.length ? prev : next;
    });
  }, [allTags]);

  const filteredNotes = useMemo(
    () => queryNotes(notes, { search: searchTerm, tags: selectedTags, view, sort }),
    [notes, searchTerm, selectedTags, view, sort],
  );

  const toggleTag = (tag: string) =>
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));

  const switchView = (next: View) => {
    setView(next);
    setSelectedTags([]);
  };

  const openNewModal = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setTagsInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setTagsInput(note.tags.join(', '));
    setIsModalOpen(true);
  };

  const handleSaveNote = () => {
    if (!title.trim()) return;

    const now = new Date().toISOString();
    const fields = {
      title: title.trim(),
      body: body.trim(),
      tags: parseTags(tagsInput),
      updatedAt: now,
    };

    if (editingId === null) {
      setNotes(prev => {
        // Date.now() can collide when notes are created in the same ms.
        const id = Math.max(Date.now(), ...prev.map(n => n.id + 1));
        return [{ id, ...fields, createdAt: now, pinned: false, archived: false }, ...prev];
      });
    } else {
      setNotes(prev => prev.map(n => (n.id === editingId ? { ...n, ...fields } : n)));
    }

    closeModal();
  };

  const handleDeleteNote = (note: Note) => {
    if (window.confirm('정말 이 메모를 삭제할까요?')) {
      setNotes(prev => prev.filter(n => n.id !== note.id));
    }
  };

  // Pin/archive are organisational, so they don't bump updatedAt.
  const togglePin = (note: Note) =>
    setNotes(prev => prev.map(n => (n.id === note.id ? { ...n, pinned: !n.pinned } : n)));

  const toggleArchive = (note: Note) => {
    setNotes(prev => prev.map(n => (n.id === note.id ? { ...n, archived: !n.archived } : n)));
    setToast({ kind: 'info', text: note.archived ? `'${note.title}' 메모를 보관함에서 꺼냈습니다.` : `'${note.title}' 메모를 보관함으로 옮겼습니다.` });
  };

  const handleExport = () => {
    const blob = new Blob([exportNotes(notes)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast({ kind: 'info', text: `메모 ${notes.length}개를 내보냈습니다.` });
  };

  const handleFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = ''; // allow choosing the same file again
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setToast({ kind: 'error', text: '파일을 읽지 못했습니다.' });
      return;
    }
    const result = parseImport(text);
    if ('error' in result) {
      setToast({ kind: 'error', text: `가져오기 실패: ${result.error}` });
      return;
    }
    setPendingImport({ fileName: file.name, notes: result.notes, skipped: result.skipped });
  };

  const confirmImport = (mode: ImportMode) => {
    if (!pendingImport) return;
    if (mode === 'replace' && notes.length > 0 &&
      !window.confirm(`현재 메모 ${notes.length}개가 모두 지워지고 가져온 메모로 바뀝니다. 계속할까요?`)) {
      return;
    }
    const result = applyImport(notes, pendingImport.notes, mode);
    setNotes(result.notes);
    setPendingImport(null);
    setToast({
      kind: 'info',
      text: mode === 'replace'
        ? `메모 ${result.added}개로 바꿨습니다.`
        : `가져오기 완료: ${result.added}개 추가, ${result.updated}개 갱신, ${result.unchanged}개 유지`,
    });
  };
  const cancelImport = useCallback(() => setPendingImport(null), []);

  const ThemeIcon = THEME_ICONS[themePref];
  const headerIconButton =
    'p-2 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-slate-800 transition-colors';
  const navButton = (active: boolean) =>
    `w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
    }`;
  const countBadge = 'text-xs bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full';
  const isFiltering = searchTerm.trim() !== '' || selectedTags.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Layers size={18} strokeWidth={2.5} />
            </div>
            <h1 className="hidden sm:block text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
              MyMemo
            </h1>
          </div>

          <div className="flex-1 max-w-md relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input
              type="search"
              aria-label="메모 검색"
              placeholder="메모 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 border-transparent border focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-full outline-none transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={handleExport} aria-label="내보내기" title="JSON으로 내보내기" className={headerIconButton}>
              <Download size={18} />
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="가져오기" title="JSON 가져오기" className={headerIconButton}>
              <Upload size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChosen}
              className="hidden"
              data-testid="import-input"
            />
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={`테마: ${THEME_LABELS[themePref]} (눌러서 변경)`}
              title={`테마: ${THEME_LABELS[themePref]}`}
              className={headerIconButton}
            >
              <ThemeIcon size={18} />
            </button>
          </div>

          <button
            onClick={openNewModal}
            aria-label="새 메모"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">새 메모</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1" aria-label="메모 분류">
            <button onClick={() => switchView('active')} aria-pressed={view === 'active' && selectedTags.length === 0} className={navButton(view === 'active' && selectedTags.length === 0)}>
              <div className="flex items-center gap-2">
                <Layers size={16} />
                <span>전체</span>
              </div>
              <span className={countBadge}>{activeCount}</span>
            </button>
            <button onClick={() => switchView('archived')} aria-pressed={view === 'archived' && selectedTags.length === 0} className={navButton(view === 'archived' && selectedTags.length === 0)}>
              <div className="flex items-center gap-2">
                <Archive size={16} />
                <span>보관함</span>
              </div>
              <span className={countBadge}>{archivedCount}</span>
            </button>

            <div className="pt-4 pb-2 px-4">
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">태그 목록</h2>
            </div>

            {allTags.length === 0 && (
              <p className="px-4 text-xs text-slate-400 dark:text-slate-500">태그가 없습니다.</p>
            )}
            {/* On small screens the tag list scrolls horizontally instead of pushing notes down. */}
            <div className="flex md:block gap-2 md:space-y-1 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:pb-0">
              {allTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selectedTags.includes(tag)}
                  className={`${navButton(selectedTags.includes(tag))} !w-auto md:!w-full flex-shrink-0 gap-3 border border-slate-200 dark:border-slate-800 md:border-transparent md:dark:border-transparent`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TagIcon size={16} className="flex-shrink-0" />
                    <span className="truncate">{tag}</span>
                  </div>
                  <span className={countBadge}>{count}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mr-1">
              {view === 'archived' ? '보관함' : '전체 메모'}
              <span className="ml-1 font-normal" aria-live="polite">· {filteredNotes.length}개</span>
            </h2>
            {selectedTags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 rounded-full text-xs font-semibold">
                #{tag}
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-label={`태그 필터 해제: ${tag}`}
                  className="p-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {selectedTags.length > 1 && (
              <button type="button" onClick={() => setSelectedTags([])} className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 underline-offset-2 hover:underline">
                필터 모두 해제
              </button>
            )}
            <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ArrowUpDown size={14} />
              <span className="sr-only">정렬</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="정렬"
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
                  <option key={key} value={key}>{SORT_LABELS[key]}</option>
                ))}
              </select>
            </label>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              {view === 'archived' && !isFiltering ? (
                <>
                  <Archive size={48} className="mb-4 opacity-20" />
                  <p>보관된 메모가 없습니다.</p>
                </>
              ) : (
                <>
                  <Layers size={48} className="mb-4 opacity-20" />
                  <p>{isFiltering ? '검색 결과에 맞는 메모가 없습니다.' : '아직 메모가 없습니다. 새 메모를 작성해 보세요.'}</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    query={searchTerm}
                    selectedTags={selectedTags}
                    onOpen={openEditModal}
                    onDelete={handleDeleteNote}
                    onTogglePin={togglePin}
                    onToggleArchive={toggleArchive}
                    onTagClick={toggleTag}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.text}
              role={toast.kind === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`pointer-events-auto max-w-md flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm ${
                toast.kind === 'error'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              }`}
            >
              <span className="flex-1">{toast.text}</span>
              <button type="button" onClick={() => setToast(null)} aria-label="알림 닫기" className="opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {pendingImport && (
          <ImportDialog
            fileName={pendingImport.fileName}
            notes={pendingImport.notes}
            skipped={pendingImport.skipped}
            existingCount={notes.length}
            onConfirm={confirmImport}
            onCancel={cancelImport}
          />
        )}
      </AnimatePresence>

      {/* New / Edit Note Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${fieldId}-heading`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSaveNote();
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
                    onClick={closeModal}
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
                        id={`${fieldId}-tags`}
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="예: 업무, 중요, 프로젝트"
                        className={`${fieldClass} pl-10`}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveNote}
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
    </div>
  );
}

const fieldClass =
  'w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-500/20 rounded-xl outline-none transition-all';
