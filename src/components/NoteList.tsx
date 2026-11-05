import { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, Layers } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import type { Note } from '../lib/notes';
import type { View } from '../lib/search';
import NoteCard from './NoteCard';

export const PAGE_SIZE = 60;

type Props = {
  notes: Note[];
  /** Changes whenever the query (search, tags, view, sort) changes; resets paging. */
  queryKey: string;
  query: string;
  selectedTags: string[];
  view: View;
  isFiltering: boolean;
  onOpen: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onToggleArchive: (note: Note) => void;
  onTagClick: (tag: string) => void;
};

/**
 * The note grid with empty states. Renders in pages so thousands of notes don't
 * block the page; the next page loads when the sentinel nears the viewport.
 */
export default function NoteList({
  notes,
  queryKey,
  query,
  selectedTags,
  view,
  isFiltering,
  onOpen,
  onDelete,
  onTogglePin,
  onToggleArchive,
  onTagClick,
}: Props) {
  // The page count resets whenever the query changes.
  const [paging, setPaging] = useState({ key: queryKey, limit: PAGE_SIZE });
  const limit = paging.key === queryKey ? paging.limit : PAGE_SIZE;
  const visibleNotes = notes.slice(0, limit);
  const remaining = notes.length - visibleNotes.length;
  const showMore = useCallback(
    () => setPaging({ key: queryKey, limit: limit + PAGE_SIZE }),
    [queryKey, limit],
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || remaining <= 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) showMore();
    }, { rootMargin: '600px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [remaining, showMore]);

  return (
    <>
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
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
            {visibleNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                query={query}
                selectedTags={selectedTags}
                onOpen={onOpen}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                onToggleArchive={onToggleArchive}
                onTagClick={onTagClick}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      {remaining > 0 && (
        <div ref={sentinelRef} className="flex justify-center pt-8">
          <button
            type="button"
            onClick={showMore}
            className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            더 보기 ({remaining}개 남음)
          </button>
        </div>
      )}
    </>
  );
}
