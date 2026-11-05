// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Note } from '../lib/notes';
import { makeNote } from '../lib/testNote';
import { MAX_IMPORT_BYTES } from '../lib/transfer';
import type { Toast } from './useToast';
import { useTransfer } from './useTransfer';

function fileEvent(file: File | undefined) {
  const input = { files: file ? [file] : [], value: 'C:\\fakepath\\x.json' };
  return { input, event: { currentTarget: input } as unknown as ChangeEvent<HTMLInputElement> };
}

function setup(initial: Note[]) {
  let notes = initial;
  const setNotes = vi.fn((next: Note[]) => {
    notes = next;
  });
  const toasts: (Toast | null)[] = [];
  const setToast = vi.fn((t: Toast | null) => void toasts.push(t));
  const hook = renderHook(() => useTransfer(notes, setNotes, setToast));
  return { hook, setNotes, toasts, notes: () => notes };
}

afterEach(() => vi.restoreAllMocks());

describe('useTransfer import', () => {
  it('rejects oversized files without reading them', async () => {
    const { hook, toasts } = setup([]);
    const file = new File(['x'], 'big.json');
    Object.defineProperty(file, 'size', { value: MAX_IMPORT_BYTES + 1 });
    const text = vi.spyOn(file, 'text');
    await act(() => hook.result.current.handleFileChosen(fileEvent(file).event));
    expect(text).not.toHaveBeenCalled();
    expect(toasts.at(-1)).toMatchObject({ kind: 'error' });
    expect(hook.result.current.pendingImport).toBeNull();
  });

  it('reports invalid JSON and clears the input so the same file can be picked again', async () => {
    const { hook, toasts } = setup([]);
    const { input, event } = fileEvent(new File(['{nope'], 'bad.json'));
    await act(() => hook.result.current.handleFileChosen(event));
    expect(input.value).toBe('');
    expect(toasts.at(-1)?.text).toContain('JSON');
  });

  it('merges after confirmation and can undo it', async () => {
    const existing = [makeNote({ id: 1, title: 'mine' })];
    const { hook, setNotes, toasts, notes } = setup(existing);
    const file = new File([JSON.stringify([{ id: 2, title: 'theirs' }])], 'b.json');
    await act(() => hook.result.current.handleFileChosen(fileEvent(file).event));
    expect(hook.result.current.pendingImport).toMatchObject({ fileName: 'b.json', skipped: 0 });

    act(() => hook.result.current.confirmImport('merge'));
    expect(notes().map(n => n.id)).toEqual([2, 1]);
    expect(hook.result.current.pendingImport).toBeNull();

    act(() => toasts.at(-1)!.action!.run());
    expect(setNotes).toHaveBeenLastCalledWith(existing);
  });

  it('asks before replacing and does nothing when declined', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { hook, setNotes } = setup([makeNote({ id: 1 })]);
    const file = new File([JSON.stringify([{ id: 2, title: 'x' }])], 'b.json');
    await act(() => hook.result.current.handleFileChosen(fileEvent(file).event));
    act(() => hook.result.current.confirmImport('replace'));
    expect(confirm).toHaveBeenCalled();
    expect(setNotes).not.toHaveBeenCalled();
    expect(hook.result.current.pendingImport).not.toBeNull();
  });
});
