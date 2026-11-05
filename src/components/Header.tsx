import { type ChangeEvent, type RefObject, useRef } from 'react';
import { Layers, Monitor, Moon, Plus, Search, Sun, Upload } from 'lucide-react';
import type { ThemePref } from '../lib/theme';
import type { ExportFormat } from '../hooks/useTransfer';
import ExportMenu from './ExportMenu';

const THEME_LABELS: Record<ThemePref, string> = { system: '시스템', light: '라이트', dark: '다크' };
const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

const headerIconButton =
  'p-2 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-slate-800 transition-colors';

type Props = {
  searchRef: RefObject<HTMLInputElement | null>;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onExport: (format: ExportFormat) => void;
  onFileChosen: (e: ChangeEvent<HTMLInputElement>) => void;
  themePref: ThemePref;
  onCycleTheme: () => void;
  onNewNote: () => void;
  /** Set to the 가져오기 button so focus returns there after the import dialog. */
  returnFocusRef: RefObject<HTMLElement | null>;
};

export default function Header({
  searchRef,
  searchTerm,
  onSearchChange,
  onExport,
  onFileChosen,
  themePref,
  onCycleTheme,
  onNewNote,
  returnFocusRef,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ThemeIcon = THEME_ICONS[themePref];

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Layers size={18} strokeWidth={2.5} />
          </div>
          <h1 className="sr-only sm:not-sr-only text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
            MyMemo
          </h1>
        </div>

        <div className="flex-1 max-w-md relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            size={18}
          />
          <input
            ref={searchRef}
            type="search"
            aria-label="메모 검색"
            aria-keyshortcuts="/"
            placeholder="메모 검색... ( / )"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 border-transparent border focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-full outline-none transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-1">
          <ExportMenu onExport={onExport} buttonClassName={headerIconButton} />
          <button
            type="button"
            onClick={e => {
              returnFocusRef.current = e.currentTarget;
              fileInputRef.current?.click();
            }}
            aria-label="가져오기"
            title="JSON 가져오기"
            className={headerIconButton}
          >
            <Upload size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onFileChosen}
            className="hidden"
            data-testid="import-input"
          />
          <button
            type="button"
            onClick={onCycleTheme}
            aria-label={`테마: ${THEME_LABELS[themePref]} (눌러서 변경)`}
            title={`테마: ${THEME_LABELS[themePref]}`}
            className={headerIconButton}
          >
            <ThemeIcon size={18} />
          </button>
        </div>

        <button
          onClick={onNewNote}
          data-new-note
          aria-label="새 메모"
          aria-keyshortcuts="N"
          title="새 메모 (N)"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">새 메모</span>
        </button>
      </div>
    </header>
  );
}
