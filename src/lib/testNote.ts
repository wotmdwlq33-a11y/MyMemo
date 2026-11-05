import type { Note } from './notes';

/** Build a valid Note for tests. */
export const makeNote = (over: Partial<Note> = {}): Note => ({
  id: 1,
  title: '제목',
  body: '본문',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  pinned: false,
  archived: false,
  ...over,
});
