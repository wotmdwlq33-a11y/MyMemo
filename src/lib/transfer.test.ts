import { describe, expect, it } from 'vitest';
import { makeNote } from './testNote';
import { EXPORT_FORMAT, MAX_IMPORT_BYTES, applyImport, exportFileName, exportNotes, parseImport } from './transfer';

describe('exportNotes', () => {
  it('writes an envelope that parseImport reads back unchanged', () => {
    const notes = [makeNote({ id: 1, pinned: true }), makeNote({ id: 2, tags: ['x'], archived: true })];
    const text = exportNotes(notes, new Date('2026-11-05T00:00:00Z'));
    const parsed = JSON.parse(text);
    expect(parsed.format).toBe(EXPORT_FORMAT);
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe('2026-11-05T00:00:00.000Z');
    expect(parseImport(text)).toEqual({ ok: true, notes, skipped: 0 });
  });

  it('names the file after the local date', () => {
    expect(exportFileName(new Date(2026, 0, 9))).toBe('mymemo-2026-01-09.json');
  });
});

describe('parseImport', () => {
  it('accepts a bare array of notes', () => {
    const result = parseImport(JSON.stringify([{ id: 5, title: 'a' }]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.notes.map(n => n.id)).toEqual([5]);
  });

  it('rejects invalid JSON', () => {
    expect(parseImport('{nope')).toEqual({ ok: false, error: expect.stringContaining('JSON') });
  });

  it('rejects files from other apps and newer versions', () => {
    expect(parseImport(JSON.stringify({ format: 'other', notes: [] })).ok).toBe(false);
    expect(parseImport(JSON.stringify({ format: 'mymemo', version: 99, notes: [{ id: 1, title: 't' }] })).ok).toBe(false);
  });

  it('rejects input without a notes array', () => {
    expect(parseImport('{}').ok).toBe(false);
    expect(parseImport('"text"').ok).toBe(false);
    expect(parseImport('null').ok).toBe(false);
  });

  it('rejects files with no valid notes', () => {
    expect(parseImport(JSON.stringify([{ title: 'no id' }, 3])).ok).toBe(false);
  });

  it('skips invalid entries, counts them and dedupes ids (last wins)', () => {
    const result = parseImport(
      JSON.stringify({
        format: 'mymemo',
        version: 1,
        notes: [{ id: 1, title: 'first' }, { id: 'x', title: 'bad' }, null, { id: 1, title: 'second' }],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipped).toBe(2);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].title).toBe('second');
  });

  it('refuses oversized input before parsing', () => {
    expect(parseImport(' '.repeat(MAX_IMPORT_BYTES + 1)).ok).toBe(false);
  });
});

describe('applyImport', () => {
  const existing = [
    makeNote({ id: 1, title: 'old', updatedAt: '2026-01-01T00:00:00.000Z' }),
    makeNote({ id: 2, title: 'keep', updatedAt: '2026-06-01T00:00:00.000Z' }),
  ];

  it('replace mode discards existing notes', () => {
    const incoming = [makeNote({ id: 9 })];
    expect(applyImport(existing, incoming, 'replace')).toEqual({ notes: incoming, added: 1, updated: 0, unchanged: 0 });
  });

  it('merge mode adds new ids and keeps the newer version of shared ids', () => {
    const incoming = [
      makeNote({ id: 1, title: 'newer', updatedAt: '2026-02-01T00:00:00.000Z' }),
      makeNote({ id: 2, title: 'stale', updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeNote({ id: 3, title: 'brand new' }),
    ];
    const result = applyImport(existing, incoming, 'merge');
    expect(result.added).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.unchanged).toBe(1);
    expect(result.notes.map(n => [n.id, n.title])).toEqual([
      [3, 'brand new'],
      [1, 'newer'],
      [2, 'keep'],
    ]);
  });

  it('merging an identical export changes nothing', () => {
    const result = applyImport(existing, existing, 'merge');
    expect(result.notes).toEqual(existing);
    expect(result).toMatchObject({ added: 0, updated: 0, unchanged: 2 });
  });
});
