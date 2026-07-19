import * as React from "react";

/** Escape a user string so it can safely become part of a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wraps every occurrence of `query` inside `text` in a <mark>.
 *
 * Rendered as React nodes rather than injected HTML — the query comes straight
 * from a text input, so building a string and using dangerouslySetInnerHTML
 * would be an XSS hole for the sake of a highlight.
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return <>{text}</>;

  const pattern = new RegExp(`(${escapeRegExp(trimmed)})`, "ig");
  const segments = text.split(pattern);

  return (
    <>
      {segments.map((segment, index) =>
        segment.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={`${segment}-${index}`}
            className="rounded bg-brand-100 px-0.5 text-brand-800"
          >
            {segment}
          </mark>
        ) : (
          <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>
        ),
      )}
    </>
  );
}
