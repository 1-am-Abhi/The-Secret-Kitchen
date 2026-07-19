/**
 * Renders structured data as a JSON-LD script tag.
 *
 * Server component by design: the payload is serialised at render time so
 * crawlers see it in the initial HTML with zero client-side JavaScript.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is generated from our own config, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
