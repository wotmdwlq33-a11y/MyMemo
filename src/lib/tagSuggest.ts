import { parseTags } from './notes';

/** The text after the last comma: the tag the user is currently typing. */
function currentToken(input: string): string {
  return input.slice(input.lastIndexOf(',') + 1).trim();
}

/**
 * Existing tags to offer while typing in the comma-separated tag field:
 * tags not already entered that contain the current partial token
 * (case-insensitive), prefix matches first, keeping `known` order otherwise.
 */
export function suggestTags(known: readonly string[], input: string, limit = 8): string[] {
  const token = currentToken(input).toLocaleLowerCase();
  const complete = input.includes(',') ? parseTags(input.slice(0, input.lastIndexOf(','))) : [];
  const used = new Set([...complete, currentToken(input)]);
  const candidates = known.filter(tag => !used.has(tag) && tag.toLocaleLowerCase().includes(token));
  const prefix = candidates.filter(tag => tag.toLocaleLowerCase().startsWith(token));
  const rest = candidates.filter(tag => !tag.toLocaleLowerCase().startsWith(token));
  return [...prefix, ...rest].slice(0, limit);
}

/** Replace the partial token with `tag` and leave the cursor ready for the next one. */
export function applyTagSuggestion(input: string, tag: string): string {
  const head = input.includes(',') ? input.slice(0, input.lastIndexOf(',') + 1) : '';
  const prefix = head ? `${head.trimEnd()} ` : '';
  return `${prefix}${tag}, `;
}
