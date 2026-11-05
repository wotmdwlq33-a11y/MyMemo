import { highlight } from '../lib/search';

/** Render text with case-insensitive matches of `query` wrapped in <mark>. */
export default function Highlight({ text, query }: { text: string; query: string }) {
  const segments = highlight(text, query);
  if (segments.length === 1 && !segments[0].match) return <>{text}</>;
  return (
    <>
      {segments.map((s, i) =>
        s.match ? (
          <mark key={i} className="bg-amber-200/80 text-inherit rounded-sm px-0.5 dark:bg-amber-400/30">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}
