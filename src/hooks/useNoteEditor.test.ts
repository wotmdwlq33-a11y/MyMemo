// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeNote } from '../lib/testNote';
import { useNoteEditor } from './useNoteEditor';

function setup() {
  const onSave = vi.fn();
  const returnFocusRef = { current: null as HTMLElement | null };
  const hook = renderHook(() => useNoteEditor(returnFocusRef, onSave));
  return { hook, onSave, returnFocusRef };
}

afterEach(() => vi.restoreAllMocks());

describe('useNoteEditor', () => {
  it('opens prefilled for editing and saves once', () => {
    const { hook, onSave } = setup();
    act(() => hook.result.current.openEdit(makeNote({ id: 3, title: 't', body: 'b', tags: ['x', 'y'] })));
    expect(hook.result.current).toMatchObject({ isOpen: true, editingId: 3, title: 't', body: 'b', tagsInput: 'x, y' });

    const staleSave = hook.result.current.save;
    act(() => hook.result.current.save());
    // A second call from the closing dialog's stale handler is ignored.
    act(() => staleSave());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      3,
      { title: 't', body: 'b', tagsInput: 'x, y' },
      expect.objectContaining({ id: 3 }),
    );
    expect(hook.result.current.isOpen).toBe(false);
  });

  it('does not save a blank title', () => {
    const { hook, onSave } = setup();
    act(() => hook.result.current.openNew());
    act(() => hook.result.current.setTitle('   '));
    act(() => hook.result.current.save());
    expect(onSave).not.toHaveBeenCalled();
    expect(hook.result.current.isOpen).toBe(true);
  });

  it('requestClose only asks when the form changed', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { hook } = setup();
    act(() => hook.result.current.openNew());
    act(() => hook.result.current.requestClose());
    expect(confirm).not.toHaveBeenCalled();
    expect(hook.result.current.isOpen).toBe(false);

    act(() => hook.result.current.openNew());
    act(() => hook.result.current.setBody('draft'));
    act(() => hook.result.current.requestClose());
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(hook.result.current.isOpen).toBe(true);

    confirm.mockReturnValue(true);
    act(() => hook.result.current.requestClose());
    expect(hook.result.current.isOpen).toBe(false);
  });

  it('remembers the focused opener, falling back to the new-note button', () => {
    const { hook, returnFocusRef } = setup();
    const fallback = document.createElement('button');
    fallback.setAttribute('data-new-note', '');
    document.body.append(fallback);
    act(() => hook.result.current.openNew());
    expect(returnFocusRef.current).toBe(fallback);

    act(() => hook.result.current.close());
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    act(() => hook.result.current.openNew());
    expect(returnFocusRef.current).toBe(opener);
  });
});
