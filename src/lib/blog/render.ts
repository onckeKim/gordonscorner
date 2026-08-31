import { escapeHtml } from '@/lib/email/templates';

/**
 * Minimal, dependency-free markdown-ish renderer for blog post content —
 * matches this app's existing preference for no heavy WYSIWYG/markdown
 * library. Supports blank-line-separated paragraphs, `## `/`### ` headings,
 * and `- ` bullet lists. Every line of text is HTML-escaped before any
 * markup is added, so admin-typed content can never inject arbitrary HTML.
 */
export function renderBlogContent(content: string): string {
  const blocks = content.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const html: string[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    if (lines.every((l) => l.startsWith('- '))) {
      const items = lines.map((l) => `<li>${escapeHtml(l.slice(2))}</li>`).join('');
      html.push(`<ul>${items}</ul>`);
      continue;
    }

    const soleLine = lines.length === 1 ? lines[0] : undefined;
    if (soleLine?.startsWith('### ')) {
      html.push(`<h3>${escapeHtml(soleLine.slice(4))}</h3>`);
      continue;
    }

    if (soleLine?.startsWith('## ')) {
      html.push(`<h2>${escapeHtml(soleLine.slice(3))}</h2>`);
      continue;
    }

    html.push(`<p>${lines.map((l) => escapeHtml(l)).join('<br />')}</p>`);
  }

  return html.join('\n');
}

/** Plain-text excerpt (first N chars of the rendered text, no markup) — used when an explicit excerpt isn't set. */
export function excerptFromContent(content: string, maxLength = 200): string {
  const text = content.replace(/^#{2,3}\s+/gm, '').replace(/^-\s+/gm, '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}
