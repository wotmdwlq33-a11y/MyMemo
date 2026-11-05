// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, type Note } from '../lib/notes';
import { makeNote } from '../lib/testNote';
import type { Toast } from './useToast';
import { useNotes } from './useNotes';

function setup(initial: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  let lastToast: Toast | null = null;
  const setToast = vi.fn((t: Toast | null) => {
    lastToast = t;
  });
  const hook = renderHook(() => useNotes(setToast));
  return { hook, setToast, toast: () => lastToast };
}

const stored = (): Note[] => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('useNotes', () => {
  it('seeds sample notes on first run and persists them', () => {
    const { result } = renderHook(() => useNotes(vi.fn()));
    expect(result.current.notes.length).toBeGreaterThan(0);
    expect(stored()).toHaveLength(result.current.notes.length);
  });

  it('creates and updates notes, trimming fields and parsing tags', () => {
    const { hook } = setup([]);
    act(() => hook.result.current.saveNote(null, { title: ' 새 메모 ', body: ' 본문 ', tagsInput: 'a, b, a' }));
    const [created] = hook.result.current.notes;
    expect(created).toMatchObject({ title: '새 메모', body: '본문', tags: ['a', 'b'], pinned: false, archived: false });
    expect(created.createdAt).toBe(created.updatedAt);

    act(() => hook.result.current.saveNote(created.id, { title: '고친 메모', body: '', tagsInput: '' }));
    expect(hook.result.current.notes).toHaveLength(1);
    expect(hook.result.current.notes[0]).toMatchObject({ id: created.id, title: '고친 메모', tags: [] });
    expect(stored()[0].title).toBe('고친 메모');
  });

  it('keeps an edit when the note was deleted meanwhile (e.g. in another tab)', () => {
    const note = makeNote({ id: 7, title: '원래', pinned: true });
    const { hook } = setup([note]);
    act(() => hook.result.current.setNotes([]));
    act(() => hook.result.current.saveNote(7, { title: '살아남은 편집', body: '', tagsInput: '' }, note));
    expect(hook.result.current.notes).toHaveLength(1);
    expect(hook.result.current.notes[0]).toMatchObject({
      id: 7,
      title: '살아남은 편집',
      createdAt: note.createdAt,
      pinned: true,
    });
  });

  it('deletes with an undo that restores the note at its position', () => {
    const notes = [makeNote({ id: 1, title: 'a' }), makeNote({ id: 2, title: 'b' }), makeNote({ id: 3, title: 'c' })];
    const { hook, toast } = setup(notes);
    act(() => hook.result.current.deleteNote(notes[1]));
    expect(hook.result.current.notes.map(n => n.id)).toEqual([1, 3]);
    expect(toast()?.action?.label).toBe('실행 취소');

    const undo = toast()!.action!.run;
    act(() => undo());
    expect(hook.result.current.notes.map(n => n.id)).toEqual([1, 2, 3]);
    // Running undo twice must not duplicate the note.
    act(() => undo());
    expect(hook.result.current.notes.map(n => n.id)).toEqual([1, 2, 3]);
  });

  it('adopts saves from other tabs and ignores unrelated or invalid events', () => {
    const { hook } = setup([makeNote({ id: 1 })]);
    const other = [makeNote({ id: 5, title: '다른 탭' })];
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated', newValue: '[]' }));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{broken' }));
    });
    expect(hook.result.current.notes.map(n => n.id)).toEqual([1]);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(other) }));
    });
    expect(hook.result.current.notes).toEqual(other);
  });

  it('shows one error toast when saving fails, not on every change', () => {
    const { hook, setToast } = setup([makeNote({ id: 1 })]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    act(() => hook.result.current.togglePin(hook.result.current.notes[0]));
    act(() => hook.result.current.togglePin(hook.result.current.notes[0]));
    const errors = setToast.mock.calls.filter(([t]) => t?.kind === 'error');
    expect(errors).toHaveLength(1);
  });

  it('pin and archive do not change updatedAt', () => {
    const note = makeNote({ id: 1 });
    const { hook } = setup([note]);
    act(() => hook.result.current.togglePin(note));
    act(() => hook.result.current.toggleArchive(hook.result.current.notes[0]));
    expect(hook.result.current.notes[0]).toMatchObject({ pinned: true, archived: true, updatedAt: note.updatedAt });
  });
});
