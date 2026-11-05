import { describe, expect, it } from 'vitest';
import { type NoteQuery, countTags, highlight, queryNotes } from './search';
import { makeNote } from './testNote';

const notes = [
  makeNote({
    id: 1,
    title: 'Banana',
    body: 'yellow fruit',
    tags: ['과일', '노랑'],
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-04T00:00:00Z',
  }),
  makeNote({
    id: 2,
    title: 'apple',
    body: 'red',
    tags: ['과일'],
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  }),
  makeNote({
    id: 3,
    title: '참외',
    body: 'Korean melon',
    tags: ['노랑'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-06T00:00:00Z',
    pinned: true,
  }),
  makeNote({ id: 4, title: 'archived', tags: ['과일'], archived: true }),
];

const base: NoteQuery = { search: '', tags: [], view: 'active', sort: 'updated' };
const ids = (q: Partial<NoteQuery>) => queryNotes(notes, { ...base, ...q }).map(n => n.id);

describe('queryNotes', () => {
  it('hides archived notes from the active view and vice versa', () => {
    expect(ids({})).toEqual([3, 1, 2]);
    expect(ids({ view: 'archived' })).toEqual([4]);
  });

  it('keeps pinned notes first for every sort', () => {
    expect(ids({ sort: 'created' })).toEqual([3, 2, 1]);
    expect(ids({ sort: 'title' })).toEqual([3, 2, 1]);
  });

  it('sorts titles case-insensitively, Hangul before Latin (ko collation)', () => {
    const unpinned = notes.map(n => ({ ...n, pinned: false }));
    expect(queryNotes(unpinned, { ...base, sort: 'title' }).map(n => n.title)).toEqual(['참외', 'apple', 'Banana']);
  });

  it('requires every selected tag', () => {
    expect(ids({ tags: ['과일'] })).toEqual([1, 2]);
    expect(ids({ tags: ['과일', '노랑'] })).toEqual([1]);
  });

  it('searches title, body and tags case-insensitively, ignoring surrounding spaces', () => {
    expect(ids({ search: '  BANANA ' })).toEqual([1]);
    expect(ids({ search: 'korean' })).toEqual([3]);
    expect(ids({ search: '노' })).toEqual([3, 1]);
  });

  it('does not mutate its input', () => {
    const copy = [...notes];
    queryNotes(notes, { ...base, sort: 'title' });
    expect(notes).toEqual(copy);
  });
});

describe('countTags', () => {
  it('counts and orders by frequency then name', () => {
    expect(countTags(notes)).toEqual([
      ['과일', 3],
      ['노랑', 2],
    ]);
  });
});

describe('highlight', () => {
  it('marks every case-insensitive match', () => {
    expect(highlight('Apple and apple', 'APPLE')).toEqual([
      { text: 'Apple', match: true },
      { text: ' and ', match: false },
      { text: 'apple', match: true },
    ]);
  });

  it('returns the whole text when the query is blank or absent', () => {
    expect(highlight('abc', '  ')).toEqual([{ text: 'abc', match: false }]);
    expect(highlight('abc', 'z')).toEqual([{ text: 'abc', match: false }]);
  });

  it('handles Korean text', () => {
    expect(highlight('개인 메모 앱', '메모')).toEqual([
      { text: '개인 ', match: false },
      { text: '메모', match: true },
      { text: ' 앱', match: false },
    ]);
  });
});
