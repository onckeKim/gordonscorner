/**
 * Renders a schema.org object as a `<script type="application/ld+json">`
 * block. `<script>` tags don't HTML-parse their contents, so the only
 * injection risk is a literal `</script>` sequence inside a string value
 * breaking out early — escaped defensively even though every current
 * caller passes static, admin-configured data, never raw guest input.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  // eslint-disable-next-line react/no-danger
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
