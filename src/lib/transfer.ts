import { type Note, toNote } from './notes';

export const EXPORT_FORMAT = 'mymemo';
export const EXPORT_VERSION = 1;
/** Refuse absurdly large files before parsing (10 MB of text). */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export type ExportFile = {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  notes: Note[];
};

export type ImportResult =
  | { ok: true; notes: Note[]; skipped: number }
  | { ok: false; error: string };

export type ImportMode = 'merge' | 'replace';

export type MergeSummary = {
  notes: Note[];
  added: number;
  updated: number;
  unchanged: number;
};

/** Serialize notes into the export file format (pretty-printed JSON). */
export function exportNotes(notes: Note[], now: Date = new Date()): string {
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    notes,
  };
  return JSON.stringify(file, null, 2);
}

/** File name like `mymemo-2026-11-05.json` (local date). */
export function exportFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `mymemo-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/**
 * Parse and validate an import file. Accepts the export envelope produced by
 * `exportNotes` or a bare array of notes. Invalid entries are skipped and
 * counted; duplicate ids inside the file keep the last occurrence.
 */
export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: '파일이 너무 큽니다 (최대 10MB).' };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: '올바른 JSON 파일이 아닙니다.' };
  }

  let list: unknown;
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    const env = data as Record<string, unknown>;
    if (env.format !== undefined && env.format !== EXPORT_FORMAT) {
      return { ok: false, error: 'MyMemo 내보내기 파일이 아닙니다.' };
    }
    if (typeof env.version === 'number' && env.version > EXPORT_VERSION) {
      return { ok: false, error: '더 새로운 버전의 MyMemo에서 만든 파일입니다.' };
    }
    list = env.notes;
  }
  if (!Array.isArray(list)) {
    return { ok: false, error: '메모 목록(notes)을 찾을 수 없습니다.' };
  }

  const byId = new Map<number, Note>();
  let skipped = 0;
  for (const item of list) {
    const note = toNote(item);
    if (note) byId.set(note.id, note);
    else skipped++;
  }
  if (byId.size === 0) {
    return { ok: false, error: '가져올 수 있는 메모가 없습니다.' };
  }
  return { ok: true, notes: [...byId.values()], skipped };
}

function sameContent(a: Note, b: Note): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Combine imported notes with the existing ones.
 * - replace: the imported list becomes the whole list.
 * - merge: notes with a new id are added; for an id that already exists the
 *   version with the later `updatedAt` wins (ties keep the existing note).
 */
export function applyImport(existing: Note[], incoming: Note[], mode: ImportMode): MergeSummary {
  if (mode === 'replace') {
    return { notes: [...incoming], added: incoming.length, updated: 0, unchanged: 0 };
  }

  const incomingById = new Map(incoming.map(n => [n.id, n]));
  let updated = 0;
  let unchanged = 0;
  const merged = existing.map(current => {
    const other = incomingById.get(current.id);
    if (!other) return current;
    incomingById.delete(current.id);
    if (Date.parse(other.updatedAt) > Date.parse(current.updatedAt) && !sameContent(current, other)) {
      updated++;
      return other;
    }
    unchanged++;
    return current;
  });
  const added = [...incomingById.values()];
  return { notes: [...added, ...merged], added: added.length, updated, unchanged };
}
