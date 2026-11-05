import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { Archive, ArchiveRestore, Calendar, Pin, Trash2 } from 'lucide-react';
import type { Note } from '../lib/notes';
import Highlight from './Highlight';

type Props = {
  note: Note;
  query: string;
  selectedTags: string[];
  onOpen: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onToggleArchive: (note: Note) => void;
  onTagClick: (tag: string) => void;
};

const iconButton =
  'p-2 rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-indigo-500 bg-slate-50 dark:bg-slate-800';
const hoverReveal =
  'opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100';

const NoteCard = forwardRef<HTMLDivElement, Props>(function NoteCard(
  { note, query, selectedTags, onOpen, onDelete, onTogglePin, onToggleArchive, onTagClick },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      data-testid="note-card"
      className={`group relative flex flex-col bg-white dark:bg-slate-900 border rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/30 focus-within:border-indigo-300 dark:focus-within:border-indigo-500 transition-all cursor-pointer ${
        note.pinned
          ? 'border-indigo-200 dark:border-indigo-500/40'
          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-500/30'
      }`}
    >
      <div className="absolute z-10 top-4 right-4 flex gap-1">
        <button
          type="button"
          onClick={() => onTogglePin(note)}
          aria-pressed={note.pinned}
          aria-label={note.pinned ? `'${note.title}' 고정 해제` : `'${note.title}' 고정`}
          title={note.pinned ? '고정 해제' : '상단에 고정'}
          className={`${iconButton} ${
            note.pinned
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
              : `text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 ${hoverReveal}`
          }`}
        >
          <Pin size={16} className={note.pinned ? 'fill-current' : undefined} />
        </button>
        <button
          type="button"
          onClick={() => onToggleArchive(note)}
          aria-label={note.archived ? `'${note.title}' 보관 해제` : `'${note.title}' 보관`}
          title={note.archived ? '보관 해제' : '보관함으로 이동'}
          className={`${iconButton} text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 ${hoverReveal}`}
        >
          {note.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
        </button>
        <button
          type="button"
          onClick={() => onDelete(note)}
          aria-label={`'${note.title}' 메모 삭제`}
          title="삭제"
          className={`${iconButton} text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 focus-visible:outline-rose-500 ${hoverReveal}`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 mb-3 pr-28">
        {note.pinned && (
          <span className="text-indigo-600 dark:text-indigo-400">고정됨 ·</span>
        )}
        <Calendar size={12} />
        <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleDateString()}</time>
      </div>

      <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {/* Stretched button: the whole card opens the editor. */}
        <button
          type="button"
          onClick={() => onOpen(note)}
          className="text-left after:absolute after:inset-0 after:rounded-2xl focus:outline-none"
        >
          <Highlight text={note.title} query={query} />
        </button>
      </h3>

      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 line-clamp-3 whitespace-pre-line">
        <Highlight text={note.body} query={query} />
      </p>

      {note.tags.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-1.5 mt-auto w-fit">
          {note.tags.map(tag => {
            const active = selectedTags.includes(tag);
            return (
              <button
                type="button"
                key={tag}
                onClick={() => onTagClick(tag)}
                aria-pressed={active}
                aria-label={`태그 ${tag}로 필터`}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  active
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300'
                }`}
              >
                #<Highlight text={tag} query={query} />
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});

export default NoteCard;
