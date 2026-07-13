/**
 * Decode common HTML entities so search answers never show coded text like &#039;.
 * Safe for plain text (not full HTML parsing).
 */
export function decodeHtmlEntities(input: string): string {
  if (!input) return '';

  let text = input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');

  // Numeric entities: &#39; &#039; &#x27;
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
    const code = Number.parseInt(hex, 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : _;
  });
  text = text.replace(/&#(\d+);/g, (_, dec: string) => {
    const code = Number.parseInt(dec, 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : _;
  });

  // Run amp decode again in case entities were double-encoded (&amp;#039;)
  if (text.includes('&amp;') || text.includes('&#')) {
    text = text
      .replace(/&amp;/gi, '&')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
        const code = Number.parseInt(hex, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _;
      })
      .replace(/&#(\d+);/g, (_, dec: string) => {
        const code = Number.parseInt(dec, 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _;
      });
  }

  return text;
}

/** Strip tags and decode entities for snippets from HTML-ish APIs. */
export function cleanDisplayText(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}
