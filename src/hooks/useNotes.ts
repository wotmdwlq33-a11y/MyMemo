import { useEffect, useRef, useState } from 'react';
import {
  type Note,
  STORAGE_KEY,
  getBrowserStorage,
  loadNotes,
  nextNoteId,
  parseStoredNotes,
  parseTags,
  saveNotes,
} from '../lib/notes';
import { SEED_DATA } from '../lib/seed';
import { deleteTag as deleteTagFrom, renameTag as renameTagIn } from '../lib/tagOps';
import type { SetToast } from './useToast';

export type NoteDraft = { title: string; body: string; tagsInput: string };

/**
 * The note list: loaded from storage once, written back on every change, kept
 * in sync with other tabs, plus the mutations the UI performs on it.
 */
export function useNotes(setToast: SetToast) {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(getBrowserStorage(), SEED_DATA));

  // Single source of persistence: every change to `notes` (including the
  // initial seed and deleting the last note) is written to storage here.
  const saveFailed = useRef(false);
  useEffect(() => {
    const ok = saveNotes(getBrowserStorage(), notes);
    if (!ok && !saveFailed.current) {
      setToast({ kind: 'error', text: '브라우저 저장소에 저장하지 못했습니다. 공간이 부족하거나 저장소가 차단되었을 수 있어요. 내보내기로 백업해 두세요.' });
    }
    saveFailed.current = !ok;
  }, [notes, setToast]);

  // Keep several open tabs in sync: another tab's save fires a `storage` event
  // here, and adopting its list prevents this tab from overwriting it later.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      const next = parseStoredNotes(e.newValue);
      if (next) setNotes(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Ask the browser not to evict our storage under pressure (once, after the
  // user has actually written something). Best effort; ignored if unsupported.
  const persistRequested = useRef(false);
  const requestPersistentStorage = () => {
    if (persistRequested.current) return;
    persistRequested.current = true;
    void navigator.storage?.persisted?.()
      .then(already => (already ? true : navigator.storage.persist?.()))
      .catch(() => undefined);
  };

  /** Create (editingId === null) or update a note from the editor's fields. */
  const saveNote = (editingId: number | null, draft: NoteDraft) => {
    const now = new Date().toISOString();
    const fields = {
      title: draft.title.trim(),
      body: draft.body.trim(),
      tags: parseTags(draft.tagsInput),
      updatedAt: now,
    };

    if (editingId === null) {
      setNotes(prev => [
        { id: nextNoteId(prev), ...fields, createdAt: now, pinned: false, archived: false },
        ...prev,
      ]);
    } else {
      const original = notes.find(n => n.id === editingId);
      setNotes(prev =>
        prev.some(n => n.id === editingId)
          ? prev.map(n => (n.id === editingId ? { ...n, ...fields } : n))
          : // Deleted meanwhile (e.g. in another tab): keep the user's edit.
            [{ ...(original ?? { id: nextNoteId(prev), createdAt: now, pinned: false, archived: false }), ...fields }, ...prev],
      );
    }

    requestPersistentStorage();
  };

  // Delete immediately and offer an undo in the toast instead of a blocking confirm.
  const deleteNote = (note: Note) => {
    const index = notes.findIndex(n => n.id === note.id);
    if (index === -1) return;
    setNotes(prev => prev.filter(n => n.id !== note.id));
    setToast({
      kind: 'info',
      text: `'${note.title}' 메모를 삭제했습니다.`,
      action: {
        label: '실행 취소',
        run: () => {
          setNotes(prev => {
            if (prev.some(n => n.id === note.id)) return prev;
            const next = [...prev];
            next.splice(Math.min(index, next.length), 0, note);
            return next;
          });
          setToast(null);
        },
      },
    });
  };

  // Pin/archive are organisational, so they don't bump updatedAt.
  const togglePin = (note: Note) =>
    setNotes(prev => prev.map(n => (n.id === note.id ? { ...n, pinned: !n.pinned } : n)));

  const toggleArchive = (note: Note) => {
    setNotes(prev => prev.map(n => (n.id === note.id ? { ...n, archived: !n.archived } : n)));
    setToast({ kind: 'info', text: note.archived ? `'${note.title}' 메모를 보관함에서 꺼냈습니다.` : `'${note.title}' 메모를 보관함으로 옮겼습니다.` });
  };

  const renameTag = (from: string, to: string) => setNotes(prev => renameTagIn(prev, from, to));
  const deleteTag = (tag: string) => setNotes(prev => deleteTagFrom(prev, tag));

  return { notes, setNotes, saveNote, deleteNote, togglePin, toggleArchive, renameTag, deleteTag };
}
