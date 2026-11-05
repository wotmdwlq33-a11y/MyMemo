import { describe, expect, it } from 'vitest';
import { notesToMarkdown } from './markdown';
import { makeNote } from './testNote';

describe('notesToMarkdown', () => {
  it('renders title, tags, dates and body, archived notes last', () => {
    const md = notesToMarkdown(
      [
        makeNote({ id: 1, title: '보관된 메모', archived: true }),
        makeNote({ id: 2, title: '할 일\n목록', body: '- 우유\n- 빵', tags: ['장보기', '집'], pinned: true }),
      ],
      new Date('2026-11-05T00:00:00Z'),
    );
    expect(md).toBe(
      [
        '# MyMemo 메모 (2026-11-05 내보냄)',
        '',
        '## 할 일 목록',
        '',
        '- 태그: #장보기 #집',
        '- 작성: 2026-01-01T00:00:00.000Z',
        '- 수정: 2026-01-01T00:00:00.000Z',
        '- 고정됨',
        '',
        '- 우유',
        '- 빵',
        '',
        '# 보관함',
        '',
        '## 보관된 메모',
        '',
        '- 작성: 2026-01-01T00:00:00.000Z',
        '- 수정: 2026-01-01T00:00:00.000Z',
        '',
        '본문',
        '',
      ].join('\n'),
    );
  });

  it('handles an empty list and blank titles', () => {
    expect(notesToMarkdown([], new Date('2026-11-05T00:00:00Z'))).toBe('# MyMemo 메모 (2026-11-05 내보냄)\n');
    expect(notesToMarkdown([makeNote({ title: '  ', body: '' })])).toContain('## (제목 없음)');
  });
});
