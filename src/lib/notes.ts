export type Note = {
  id: number;
  title: string;
  body: string;
  tags: string[];
  /** ISO timestamp of creation. Older stored notes fall back to updatedAt. */
  createdAt: string;
  updatedAt: string;
  /** Pinned notes are listed before the others. */
  pinned: boolean;
  /** Archived notes are hidden from the main list. */
  archived: boolean;
};

export const STORAGE_KEY = 'mymemo.notes';
export const BACKUP_KEY = 'mymemo.notes.corrupt-backup';

type ReadableStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Split a comma-separated tag string into trimmed, non-empty, unique tags.
 * Order of first appearance is preserved.
 */
export function parseTags(input: string): string[] {
  return normalizeTags(input.split(','));
}

/** Trim, drop empty entries and remove duplicates from a tag list. */
export function normalizeTags(tags: unknown[]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const trimmed = tag.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/**
 * Validate and normalize an unknown value into a Note.
 * Returns null when the required fields (finite numeric id, string title) are
 * missing; optional fields get safe defaults.
 */
export function toNote(value: unknown): Note | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'number' || !Number.isFinite(v.id) || typeof v.title !== 'string') {
    return null;
  }
  const updatedAt = isDateString(v.updatedAt) ? v.updatedAt : new Date(0).toISOString();
  const createdAt = isDateString(v.createdAt) ? v.createdAt : updatedAt;
  return {
    id: v.id,
    title: v.title,
    body: typeof v.body === 'string' ? v.body : '',
    tags: Array.isArray(v.tags) ? normalizeTags(v.tags) : [],
    createdAt,
    updatedAt,
    pinned: v.pinned === true,
    archived: v.archived === true,
  };
}

/**
 * Load notes from storage without ever throwing.
 * - Nothing stored yet: returns `fallback` (seed data).
 * - Stored value is not valid JSON / not an array: the raw value is copied to
 *   BACKUP_KEY so it is not lost when the app saves over it, and an empty
 *   list is returned.
 * - Individual malformed entries are dropped; tags are normalized.
 */
export function loadNotes(storage: ReadableStorage | null, fallback: Note[]): Note[] {
  if (!storage) return fallback;
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('stored notes are not an array');
    return parsed.map(toNote).filter((n): n is Note => n !== null);
  } catch {
    try {
      storage.setItem(BACKUP_KEY, raw);
    } catch {
      // Ignore: backup is best effort.
    }
    return [];
  }
}

/** Persist notes. Returns false if storage is unavailable or full. */
export function saveNotes(storage: ReadableStorage | null, notes: Note[]): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}

/** Access window.localStorage, which can throw in some privacy modes. */
export function getBrowserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}
