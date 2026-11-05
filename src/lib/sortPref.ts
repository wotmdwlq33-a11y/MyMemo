import type { SortKey } from './search';

export const SORT_KEY = 'mymemo.sort';

type KV = Pick<Storage, 'getItem' | 'setItem'>;

export function loadSortPref(storage: KV | null): SortKey {
  try {
    const v = storage?.getItem(SORT_KEY);
    return v === 'created' || v === 'title' || v === 'updated' ? v : 'updated';
  } catch {
    return 'updated';
  }
}

export function saveSortPref(storage: KV | null, sort: SortKey): void {
  try {
    storage?.setItem(SORT_KEY, sort);
  } catch {
    // Ignore: sort order simply won't persist.
  }
}
