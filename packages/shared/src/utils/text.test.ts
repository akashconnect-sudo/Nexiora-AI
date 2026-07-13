import { describe, expect, it } from 'vitest';
import { cleanDisplayText, decodeHtmlEntities } from './text';

describe('decodeHtmlEntities', () => {
  it('decodes apostrophe entities used by Wikipedia', () => {
    expect(decodeHtmlEntities("It&#039;s almost")).toBe("It's almost");
    expect(decodeHtmlEntities("India&#39;s Best")).toBe("India's Best");
  });

  it('handles common named entities and double-encoding', () => {
    expect(decodeHtmlEntities('A &amp; B')).toBe('A & B');
    expect(decodeHtmlEntities('&amp;#039;')).toBe("'");
    expect(decodeHtmlEntities('&quot;hello&quot;')).toBe('"hello"');
  });

  it('cleanDisplayText strips tags and entities', () => {
    expect(cleanDisplayText('<span>It&#039;s</span> fine')).toBe("It's fine");
  });
});
