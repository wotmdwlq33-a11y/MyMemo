import type { Note } from './notes';

export type SortKey = 'updated' | 'created' | 'title';
export type View = 'active' | 'archived';

export const SORT_LABELS: Record<SortKey, string> = {
  updated: '최근 수정순',
  created: '최근 작성순',
  title: '제목순',
};

export type NoteQuery = {
  search: string;
  /** A note must carry every selected tag. */
  tags: string[];
  view: View;
  sort: SortKey;
};

function includesCI(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase().includes(needle);
}

/** Filter by view/tags/search text and sort; pinned notes always come first. */
export function queryNotes(notes: Note[], q: NoteQuery): Note[] {
  const needle = q.search.trim().toLocaleLowerCase();
  const filtered = notes.filter(note => {
    if (note.archived !== (q.view === 'archived')) return false;
    if (!q.tags.every(t => note.tags.includes(t))) return false;
    if (!needle) return true;
    return (
      includesCI(note.title, needle) ||
      includesCI(note.body, needle) ||
      note.tags.some(t => includesCI(t, needle))
    );
  });
  return filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return compare(a, b, q.sort);
  });
}

const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });

function compare(a: Note, b: Note, sort: SortKey): number {
  switch (sort) {
    case 'title':
      return collator.compare(a.title, b.title) || b.id - a.id;
    case 'created':
      return Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id;
    case 'updated':
    default:
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id - a.id;
  }
}

/** Count tags among the given notes, most used first (ties by name). */
export function countTags(notes: Note[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]));
}

export type Segment = { text: string; match: boolean };

/**
 * Split `text` into segments marking case-insensitive occurrences of `query`.
 * Returns a single non-matching segment when the query is blank.
 */
export function highlight(text: string, query: string): Segment[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [{ text, match: false }];
  const lower = text.toLocaleLowerCase();
  // Lower-casing can change string length for a few characters; fall back to
  // no highlighting rather than producing misaligned slices.
  if (lower.length !== text.length) return [{ text, match: false }];
  const segments: Segment[] = [];
  let from = 0;
  for (;;) {
    const at = lower.indexOf(needle, from);
    if (at === -1) break;
    if (at > from) segments.push({ text: text.slice(from, at), match: false });
    segments.push({ text: text.slice(at, at + needle.length), match: true });
    from = at + needle.length;
  }
  if (from < text.length) segments.push({ text: text.slice(from), match: false });
  return segments.length ? segments : [{ text, match: false }];
}
