import type { MouseEvent } from 'react';
import { Archive, Layers, Tag as TagIcon } from 'lucide-react';
import type { View } from '../lib/search';

const navButton = (active: boolean) =>
  `w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    active
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
  }`;
const countBadge = 'text-xs bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full';

type Props = {
  view: View;
  activeCount: number;
  archivedCount: number;
  /** Tags in the current view with their note counts. */
  tags: [string, number][];
  activeTags: string[];
  /** Whether any note (in either view) has a tag, which enables 관리. */
  hasAnyTags: boolean;
  onSwitchView: (view: View) => void;
  onToggleTag: (tag: string) => void;
  onOpenTagManager: (e: MouseEvent<HTMLButtonElement>) => void;
};

export default function Sidebar({
  view,
  activeCount,
  archivedCount,
  tags,
  activeTags,
  hasAnyTags,
  onSwitchView,
  onToggleTag,
  onOpenTagManager,
}: Props) {
  const noTagFilter = activeTags.length === 0;
  return (
    <aside className="w-full md:w-64 flex-shrink-0">
      <nav className="space-y-1" aria-label="메모 분류">
        <button onClick={() => onSwitchView('active')} aria-pressed={view === 'active' && noTagFilter} className={navButton(view === 'active' && noTagFilter)}>
          <div className="flex items-center gap-2">
            <Layers size={16} />
            <span>전체</span>
          </div>
          <span className={countBadge}>{activeCount}</span>
        </button>
        <button onClick={() => onSwitchView('archived')} aria-pressed={view === 'archived' && noTagFilter} className={navButton(view === 'archived' && noTagFilter)}>
          <div className="flex items-center gap-2">
            <Archive size={16} />
            <span>보관함</span>
          </div>
          <span className={countBadge}>{archivedCount}</span>
        </button>

        <div className="pt-4 pb-2 px-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">태그 목록</h2>
          {hasAnyTags && (
            <button
              type="button"
              onClick={onOpenTagManager}
              aria-label="태그 관리"
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              관리
            </button>
          )}
        </div>

        {tags.length === 0 && (
          <p className="px-4 text-xs text-slate-500 dark:text-slate-400">태그가 없습니다.</p>
        )}
        {/* On small screens the tag list scrolls horizontally instead of pushing notes down. */}
        <div className="flex md:block gap-2 md:space-y-1 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:pb-0">
          {tags.map(([tag, count]) => (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              aria-pressed={activeTags.includes(tag)}
              className={`${navButton(activeTags.includes(tag))} !w-auto md:!w-full flex-shrink-0 gap-3 border border-slate-200 dark:border-slate-800 md:border-transparent md:dark:border-transparent`}
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
  );
}
