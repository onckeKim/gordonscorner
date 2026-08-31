import { describe, expect, it } from 'vitest';
import { renderBlogContent, excerptFromContent } from './render';

describe('renderBlogContent', () => {
  it('wraps a single paragraph in <p>', () => {
    expect(renderBlogContent('Just one paragraph.')).toBe('<p>Just one paragraph.</p>');
  });

  it('separates blank-line-delimited blocks into their own paragraphs', () => {
    const html = renderBlogContent('First paragraph.\n\nSecond paragraph.');
    expect(html).toBe('<p>First paragraph.</p>\n<p>Second paragraph.</p>');
  });

  it('renders a "## " line as an h2', () => {
    expect(renderBlogContent('## Getting here')).toBe('<h2>Getting here</h2>');
  });

  it('renders a "### " line as an h3', () => {
    expect(renderBlogContent('### Parking')).toBe('<h3>Parking</h3>');
  });

  it('renders consecutive "- " lines as a single <ul>', () => {
    const html = renderBlogContent('- First item\n- Second item\n- Third item');
    expect(html).toBe('<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>');
  });

  it('joins multiple lines within one paragraph block with <br />', () => {
    const html = renderBlogContent('Line one.\nLine two.');
    expect(html).toBe('<p>Line one.<br />Line two.</p>');
  });

  it('HTML-escapes admin-typed content — never emits raw markup from source text', () => {
    const html = renderBlogContent('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes text inside headings too', () => {
    const html = renderBlogContent('## <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('escapes text inside list items too', () => {
    const html = renderBlogContent('- <b>bold</b> item');
    expect(html).not.toContain('<b>bold</b>');
    expect(html).toContain('&lt;b&gt;');
  });

  it('handles mixed content with headings, paragraphs, and lists in order', () => {
    const content = '## Attractions\n\nSome intro text.\n\n- Beach\n- Cliff path';
    const html = renderBlogContent(content);
    expect(html).toBe('<h2>Attractions</h2>\n<p>Some intro text.</p>\n<ul><li>Beach</li><li>Cliff path</li></ul>');
  });

  it('ignores extra blank lines between blocks', () => {
    const html = renderBlogContent('First.\n\n\n\nSecond.');
    expect(html).toBe('<p>First.</p>\n<p>Second.</p>');
  });
});

describe('excerptFromContent', () => {
  it('returns short content unchanged', () => {
    expect(excerptFromContent('A short piece of text.')).toBe('A short piece of text.');
  });

  it('strips heading and list markers', () => {
    expect(excerptFromContent('## Heading\n\n- item one')).toBe('Heading item one');
  });

  it('truncates long content and appends an ellipsis', () => {
    const long = 'word '.repeat(100).trim();
    const excerpt = excerptFromContent(long, 50);
    expect(excerpt.length).toBeLessThanOrEqual(51);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('collapses internal whitespace/newlines to single spaces', () => {
    expect(excerptFromContent('Line one.\n\nLine   two.')).toBe('Line one. Line two.');
  });
});
