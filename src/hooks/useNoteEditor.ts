import { type RefObject, useCallback, useRef, useState } from 'react';
import type { Note } from '../lib/notes';
import type { NoteDraft } from './useNotes';

const EMPTY_FORM = { title: '', body: '', tags: '' };

/**
 * State of the new / edit note dialog. Openers record the focused element in
 * `returnFocusRef` so focus can return there when the dialog closes.
 */
export function useNoteEditor(
  returnFocusRef: RefObject<HTMLElement | null>,
  onSave: (editingId: number | null, draft: NoteDraft, original?: Note) => void,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  // null = creating a new note; otherwise the id of the note being edited
  const [editingId, setEditingId] = useState<number | null>(null);
  // Synchronous "modal is open" flag: the closing modal stays mounted during its
  // exit animation with stale handlers, so a double click on 저장 must be ignored.
  const modalOpenRef = useRef(false);
  // Snapshot of the form when the modal opened, to detect unsaved edits.
  const initialFormRef = useRef(EMPTY_FORM);
  // The note being edited, as it was when the dialog opened.
  const [original, setOriginal] = useState<Note | undefined>(undefined);

  const rememberOpener = useCallback(() => {
    const active = document.activeElement;
    returnFocusRef.current =
      active instanceof HTMLElement && active !== document.body
        ? active
        : document.querySelector<HTMLElement>('[data-new-note]');
  }, [returnFocusRef]);

  const openWith = useCallback(
    (id: number | null, form: typeof EMPTY_FORM) => {
      rememberOpener();
      modalOpenRef.current = true;
      initialFormRef.current = form;
      setEditingId(id);
      setTitle(form.title);
      setBody(form.body);
      setTagsInput(form.tags);
      setIsOpen(true);
    },
    [rememberOpener],
  );

  const openNew = useCallback(() => {
    setOriginal(undefined);
    openWith(null, EMPTY_FORM);
  }, [openWith]);

  const openEdit = (note: Note) => {
    setOriginal(note);
    openWith(note.id, { title: note.title, body: note.body, tags: note.tags.join(', ') });
  };

  const close = useCallback(() => {
    modalOpenRef.current = false;
    setIsOpen(false);
    setEditingId(null);
    setTitle('');
    setBody('');
    setTagsInput('');
  }, []);

  // Escape / backdrop clicks are easy to hit by accident, so they ask before
  // throwing away edits. The explicit 취소 and ✕ buttons close directly.
  const requestClose = () => {
    const initial = initialFormRef.current;
    const dirty = title !== initial.title || body !== initial.body || tagsInput !== initial.tags;
    if (dirty && !window.confirm('저장하지 않은 내용이 있습니다. 닫을까요?')) return;
    close();
  };

  const save = () => {
    if (!modalOpenRef.current || !title.trim()) return;
    onSave(editingId, { title, body, tagsInput }, original);
    close();
  };

  return {
    isOpen,
    editingId,
    title,
    setTitle,
    body,
    setBody,
    tagsInput,
    setTagsInput,
    openNew,
    openEdit,
    close,
    requestClose,
    save,
  };
}

export type NoteEditor = ReturnType<typeof useNoteEditor>;
