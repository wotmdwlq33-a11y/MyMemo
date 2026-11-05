import { ArrowUpDown, X } from 'lucide-react';
import { type SortKey, type View, SORT_LABELS } from '../lib/search';

type Props = {
  view: View;
  resultCount: number;
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
};

/** Heading with result count, active tag filter chips and the sort select. */
export default function ListToolbar({
  view,
  resultCount,
  activeTags,
  onToggleTag,
  onClearTags,
  sort,
  onSortChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mr-1">
        {view === 'archived' ? '보관함' : '전체 메모'}
        <span className="ml-1 font-normal" aria-live="polite">
          · {resultCount}개
        </span>
      </h2>
      {activeTags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 pl-3 pr-1 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 rounded-full text-xs font-semibold"
        >
          #{tag}
          <button
            type="button"
            onClick={() => onToggleTag(tag)}
            aria-label={`태그 필터 해제: ${tag}`}
            className="p-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {activeTags.length > 1 && (
        <button
          type="button"
          onClick={onClearTags}
          className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 underline-offset-2 hover:underline"
        >
          필터 모두 해제
        </button>
      )}
      <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <ArrowUpDown size={14} />
        <span className="sr-only">정렬</span>
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value as SortKey)}
          aria-label="정렬"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
