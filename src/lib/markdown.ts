import type { Note } from './notes';

/** Keep a title on one line so it stays a single Markdown heading. */
function inline(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').trim();
}

/**
 * Render notes as one readable Markdown document (for reading or moving to
 * another app; the JSON export remains the lossless backup format).
 * Archived notes are listed after active ones under their own heading.
 */
export function notesToMarkdown(notes: readonly Note[], now: Date = new Date()): string {
  const section = (list: readonly Note[]) =>
    list.map(note => {
      const meta = [
        note.tags.length > 0 ? `태그: ${note.tags.map(t => `#${t}`).join(' ')}` : null,
        `작성: ${note.createdAt}`,
        `수정: ${note.updatedAt}`,
        note.pinned ? '고정됨' : null,
      ].filter(Boolean);
      const body = note.body.trim();
      return [
        `## ${inline(note.title) || '(제목 없음)'}`,
        '',
        ...meta.map(m => `- ${m}`),
        ...(body ? ['', body] : []),
      ].join('\n');
    });

  const active = notes.filter(n => !n.archived);
  const archived = notes.filter(n => n.archived);
  const parts = [`# MyMemo 메모 (${now.toISOString().slice(0, 10)} 내보냄)`, ...section(active)];
  if (archived.length > 0) parts.push('# 보관함', ...section(archived));
  return `${parts.join('\n\n')}\n`;
}
