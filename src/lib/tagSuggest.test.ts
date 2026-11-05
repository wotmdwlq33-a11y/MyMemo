import { describe, expect, it } from 'vitest';
import { applyTagSuggestion, suggestTags } from './tagSuggest';

const known = ['업무', '개발', '디자인', '개인', 'Design'];

describe('suggestTags', () => {
  it('offers every tag when nothing is typed', () => {
    expect(suggestTags(known, '')).toEqual(known);
  });

  it('filters by the current token, prefix matches first, case-insensitively', () => {
    expect(suggestTags(known, '업무, 개')).toEqual(['개발', '개인']);
    expect(suggestTags(known, 'des')).toEqual(['Design']);
    expect(suggestTags(['ab', 'cab'], 'ab'.slice(1))).toEqual(['ab', 'cab']);
  });

  it('skips tags that are already entered', () => {
    expect(suggestTags(known, '업무, 개발, ')).toEqual(['디자인', '개인', 'Design']);
    expect(suggestTags(known, '디자인')).toEqual([]);
  });

  it('respects the limit', () => {
    expect(suggestTags(known, '', 2)).toHaveLength(2);
  });
});

describe('applyTagSuggestion', () => {
  it('replaces the partial token', () => {
    expect(applyTagSuggestion('업무, 개', '개발')).toBe('업무, 개발, ');
    expect(applyTagSuggestion('', '업무')).toBe('업무, ');
    expect(applyTagSuggestion('디', '디자인')).toBe('디자인, ');
    expect(applyTagSuggestion('업무,', '개발')).toBe('업무, 개발, ');
  });
});
