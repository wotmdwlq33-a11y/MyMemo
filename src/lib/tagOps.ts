import { type Note, normalizeTags } from './notes';

/**
 * Rename `from` to `to` on every note. If a note already has `to`, the two are
 * merged. Touched notes get `updatedAt = now` so the change wins on import merge.
 * Returns the same array when nothing changes.
 */
export function renameTag(notes: Note[], from: string, to: string, now: string = new Date().toISOString()): Note[] {
  const target = to.trim();
  if (!target || target.includes(',') || target === from) return notes;
  let changed = false;
  const next = notes.map(note => {
    if (!note.tags.includes(from)) return note;
    changed = true;
    return { ...note, tags: normalizeTags(note.tags.map(t => (t === from ? target : t))), updatedAt: now };
  });
  return changed ? next : notes;
}

/** Remove `tag` from every note (the notes themselves are kept). */
export function deleteTag(notes: Note[], tag: string, now: string = new Date().toISOString()): Note[] {
  let changed = false;
  const next = notes.map(note => {
    if (!note.tags.includes(tag)) return note;
    changed = true;
    return { ...note, tags: note.tags.filter(t => t !== tag), updatedAt: now };
  });
  return changed ? next : notes;
}
