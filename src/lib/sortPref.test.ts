import { describe, expect, it } from 'vitest';
import { SORT_KEY, loadSortPref, saveSortPref } from './sortPref';

const mem = (init: Record<string, string> = {}) => {
  const d = new Map(Object.entries(init));
  return { d, getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v) };
};

describe('sort preference', () => {
  it('defaults to updated for missing, unknown or unreadable values', () => {
    expect(loadSortPref(null)).toBe('updated');
    expect(loadSortPref(mem())).toBe('updated');
    expect(loadSortPref(mem({ [SORT_KEY]: 'random' }))).toBe('updated');
    expect(
      loadSortPref({
        getItem: () => {
          throw new Error('x');
        },
        setItem: () => {},
      }),
    ).toBe('updated');
  });

  it('round-trips each sort key under mymemo.sort', () => {
    const s = mem();
    for (const key of ['created', 'title', 'updated'] as const) {
      saveSortPref(s, key);
      expect(s.d.get('mymemo.sort')).toBe(key);
      expect(loadSortPref(s)).toBe(key);
    }
  });

  it('ignores storage write failures', () => {
    expect(() =>
      saveSortPref(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error('full');
          },
        },
        'title',
      ),
    ).not.toThrow();
    expect(() => saveSortPref(null, 'title')).not.toThrow();
  });
});
