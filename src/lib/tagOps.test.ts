import { describe, expect, it } from 'vitest';
import { deleteTag, renameTag } from './tagOps';
import { makeNote } from './testNote';

const NOW = '2026-11-05T00:00:00.000Z';
const notes = [
  makeNote({ id: 1, tags: ['업무', '중요'] }),
  makeNote({ id: 2, tags: ['일', '업무'] }),
  makeNote({ id: 3, tags: ['개인'] }),
];

describe('renameTag', () => {
  it('renames on every note and bumps updatedAt only where it changed', () => {
    const next = renameTag(notes, '업무', '회사', NOW);
    expect(next.map(n => n.tags)).toEqual([['회사', '중요'], ['일', '회사'], ['개인']]);
    expect(next.map(n => n.updatedAt)).toEqual([NOW, NOW, notes[2].updatedAt]);
    expect(next[2]).toBe(notes[2]);
  });

  it('merges into an existing tag without duplicates', () => {
    expect(renameTag(notes, '일', '업무', NOW)[1].tags).toEqual(['업무']);
  });

  it('ignores blank, comma-containing or unchanged names', () => {
    expect(renameTag(notes, '업무', '  ')).toBe(notes);
    expect(renameTag(notes, '업무', 'a,b')).toBe(notes);
    expect(renameTag(notes, '업무', '업무')).toBe(notes);
    expect(renameTag(notes, '없음', 'x')).toBe(notes);
  });

  it('trims the new name', () => {
    expect(renameTag(notes, '개인', ' 사생활 ', NOW)[2].tags).toEqual(['사생활']);
  });
});

describe('deleteTag', () => {
  it('removes the tag but keeps the notes', () => {
    const next = deleteTag(notes, '업무', NOW);
    expect(next).toHaveLength(3);
    expect(next.map(n => n.tags)).toEqual([['중요'], ['일'], ['개인']]);
    expect(deleteTag(notes, '없음')).toBe(notes);
  });
});
