import { describe, expect, it } from 'vitest';
import {
  BACKUP_KEY,
  STORAGE_KEY,
  type Note,
  clearCorruptBackup,
  loadNotes,
  nextNoteId,
  parseStoredNotes,
  readCorruptBackup,
  normalizeTags,
  parseTags,
  saveNotes,
} from './notes';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}

const note = (over: Partial<Note> = {}): Note => ({
  id: 1,
  title: '제목',
  body: '본문',
  tags: ['a'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  pinned: false,
  archived: false,
  ...over,
});

const SEED = [note({ id: 99, title: 'seed' })];

describe('parseTags', () => {
  it('trims, drops empty entries and dedupes in order', () => {
    expect(parseTags(' 업무, 중요 ,, 업무,  ,중요,개발 ')).toEqual(['업무', '중요', '개발']);
  });

  it('returns an empty list for blank input', () => {
    expect(parseTags('')).toEqual([]);
    expect(parseTags(' , , ')).toEqual([]);
  });
});

describe('normalizeTags', () => {
  it('ignores non-string values', () => {
    expect(normalizeTags(['a', 1, null, ' a ', 'b'])).toEqual(['a', 'b']);
  });
});

describe('loadNotes', () => {
  it('returns the fallback when nothing is stored', () => {
    expect(loadNotes(memoryStorage(), SEED)).toBe(SEED);
  });

  it('returns the fallback when storage is unavailable', () => {
    expect(loadNotes(null, SEED)).toBe(SEED);
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
    };
    expect(loadNotes(throwing, SEED)).toBe(SEED);
  });

  it('loads stored notes, including an empty list', () => {
    const notes = [note()];
    expect(loadNotes(memoryStorage({ [STORAGE_KEY]: JSON.stringify(notes) }), SEED)).toEqual(notes);
    expect(loadNotes(memoryStorage({ [STORAGE_KEY]: '[]' }), SEED)).toEqual([]);
  });

  it('backs up corrupt JSON and returns an empty list instead of throwing', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{bad json' });
    expect(loadNotes(storage, SEED)).toEqual([]);
    expect(storage.data.get(BACKUP_KEY)).toBe('{bad json');
  });

  it('treats a non-array value as corrupt', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{"id":1}' });
    expect(loadNotes(storage, SEED)).toEqual([]);
    expect(storage.data.get(BACKUP_KEY)).toBe('{"id":1}');
  });

  it('drops malformed entries and normalizes the rest', () => {
    const raw = JSON.stringify([
      null,
      { title: 'no id' },
      { id: 2, title: 't', tags: ['x', ' x ', '', 3], updatedAt: 'not a date' },
    ]);
    expect(loadNotes(memoryStorage({ [STORAGE_KEY]: raw }), SEED)).toEqual([
      {
        id: 2,
        title: 't',
        body: '',
        tags: ['x'],
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        pinned: false,
        archived: false,
      },
    ]);
  });

  it('migrates notes saved before createdAt/pinned/archived existed', () => {
    const raw = JSON.stringify([{ id: 3, title: 'old', body: 'b', tags: [], updatedAt: '2025-05-05T00:00:00.000Z' }]);
    expect(loadNotes(memoryStorage({ [STORAGE_KEY]: raw }), SEED)).toEqual([
      {
        id: 3,
        title: 'old',
        body: 'b',
        tags: [],
        createdAt: '2025-05-05T00:00:00.000Z',
        updatedAt: '2025-05-05T00:00:00.000Z',
        pinned: false,
        archived: false,
      },
    ]);
  });

  it('only accepts literal true for pinned/archived', () => {
    const raw = JSON.stringify([{ id: 4, title: 't', pinned: 'yes', archived: 1 }]);
    const [n] = loadNotes(memoryStorage({ [STORAGE_KEY]: raw }), SEED);
    expect(n.pinned).toBe(false);
    expect(n.archived).toBe(false);
  });
});

describe('saveNotes', () => {
  it('round-trips through loadNotes', () => {
    const storage = memoryStorage();
    const notes = [note({ id: 1 }), note({ id: 2, tags: [] })];
    expect(saveNotes(storage, notes)).toBe(true);
    expect(loadNotes(storage, SEED)).toEqual(notes);
  });

  it('returns false instead of throwing when storage fails', () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(saveNotes(full, [note()])).toBe(false);
    expect(saveNotes(null, [note()])).toBe(false);
  });
});

describe('nextNoteId', () => {
  it('uses the clock unless an existing id is at or beyond it', () => {
    expect(nextNoteId([note({ id: 5 })], 100)).toBe(100);
    expect(nextNoteId([note({ id: 100 })], 100)).toBe(101);
    expect(nextNoteId([], 7)).toBe(7);
  });

  it('handles very large lists without overflowing the stack', () => {
    const many = Array.from({ length: 300_000 }, (_, i) => ({ id: i + 1 }) as Note);
    expect(nextNoteId(many, 0)).toBe(300_001);
  });
});

describe('parseStoredNotes', () => {
  it('returns null for non-arrays and invalid JSON', () => {
    expect(parseStoredNotes('{')).toBeNull();
    expect(parseStoredNotes('{"a":1}')).toBeNull();
  });

  it('parses and normalizes arrays', () => {
    expect(parseStoredNotes(JSON.stringify([note(), { bad: true }]))).toEqual([note()]);
  });
});

describe('corrupt backup helpers', () => {
  it('reads and clears the backup', () => {
    const storage = {
      ...memoryStorage({ [BACKUP_KEY]: 'raw' }),
      removeItem(k: string) {
        this.data.delete(k);
      },
    };
    expect(readCorruptBackup(storage)).toBe('raw');
    clearCorruptBackup(storage);
    expect(readCorruptBackup(storage)).toBeNull();
    expect(readCorruptBackup(null)).toBeNull();
  });
});
