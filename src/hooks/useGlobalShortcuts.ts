import { useEffect } from 'react';

/**
 * Global shortcuts: "/" focuses search, "n" opens a new note. Ignored while
 * `disabled` (a dialog is open), with modifier keys, during IME composition,
 * and while typing in a form field.
 */
export function useGlobalShortcuts(disabled: boolean, onSearch: () => void, onNewNote: () => void): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.key === '/') {
        e.preventDefault();
        onSearch();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNewNote();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, onSearch, onNewNote]);
}
