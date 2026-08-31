/**
 * Deterministic content-quality checks for the blog editor — no AI, no
 * network call, just counting and pattern-matching against the same
 * content the editor already has in memory. Every number here is
 * genuinely computed from the input, never guessed.
 */

function countWords(text: string): number {
  const words = text.trim().match(/[\p{L}\p{N}']+/gu);
  return words ? words.length : 0;
}

function countSentences(text: string): number {
  const sentences = text.trim().match(/[^.!?]+[.!?]+/g);
  return sentences && sentences.length > 0 ? sentences.length : text.trim() ? 1 : 0;
}

/** Crude but standard heuristic: count vowel-group clusters per word. */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;
  if (w.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

export interface ReadabilityResult {
  /** Flesch Reading Ease, roughly 0 (very hard) to 100 (very easy). */
  fleschScore: number;
  label: 'Very easy' | 'Easy' | 'Fairly easy' | 'Standard' | 'Fairly difficult' | 'Difficult' | 'Very difficult';
  wordCount: number;
  sentenceCount: number;
}

export function computeReadability(content: string): ReadabilityResult {
  const plainText = content.replace(/^#{2,3}\s+/gm, '').replace(/^-\s+/gm, '');
  const words = plainText.trim().match(/[\p{L}\p{N}']+/gu) ?? [];
  const wordCount = words.length;
  const sentenceCount = countSentences(plainText);

  if (wordCount === 0 || sentenceCount === 0) {
    return { fleschScore: 0, label: 'Very difficult', wordCount, sentenceCount };
  }

  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const fleschScore = Math.max(
    0,
    Math.min(100, 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount)),
  );

  let label: ReadabilityResult['label'];
  if (fleschScore >= 90) label = 'Very easy';
  else if (fleschScore >= 70) label = 'Easy';
  else if (fleschScore >= 60) label = 'Fairly easy';
  else if (fleschScore >= 50) label = 'Standard';
  else if (fleschScore >= 30) label = 'Fairly difficult';
  else if (fleschScore >= 10) label = 'Difficult';
  else label = 'Very difficult';

  return { fleschScore: Math.round(fleschScore), label, wordCount, sentenceCount };
}

export interface SeoCheckInput {
  title: string;
  description: string;
  content: string;
  focusKeyword?: string;
  featuredImageAlt?: string;
  internalLinkCount: number;
}

export interface SeoCheckResult {
  passed: string[];
  warnings: string[];
  /** 0–100. */
  score: number;
}

export function computeSeoChecks(input: SeoCheckInput): SeoCheckResult {
  const passed: string[] = [];
  const warnings: string[] = [];
  const keyword = input.focusKeyword?.trim().toLowerCase();
  const titleLen = input.title.trim().length;
  const descLen = input.description.trim().length;
  const wordCount = countWords(input.content);

  const check = (ok: boolean, passLabel: string, warnLabel: string) => {
    if (ok) passed.push(passLabel);
    else warnings.push(warnLabel);
  };

  check(titleLen > 0 && titleLen >= 30 && titleLen <= 60, 'Title length is good (30–60 characters)', titleLen === 0 ? 'Missing a title' : `Title is ${titleLen} characters — aim for 30–60`);
  check(descLen > 0 && descLen >= 120 && descLen <= 160, 'Meta description length is good (120–160 characters)', descLen === 0 ? 'Missing a meta description' : `Meta description is ${descLen} characters — aim for 120–160`);
  check(wordCount >= 300, `Content is ${wordCount} words (300+ recommended)`, `Content is only ${wordCount} words — aim for 300+`);
  check(input.internalLinkCount >= 1, `Contains ${input.internalLinkCount} internal link(s)`, 'No internal links found — link to another page on the site, e.g. [Accommodation](/accommodation)');
  check(Boolean(input.featuredImageAlt?.trim()), 'Featured image has alt text', 'Featured image is missing alt text');

  if (keyword) {
    check(input.title.toLowerCase().includes(keyword), 'Focus keyword appears in the title', 'Focus keyword is missing from the title');
    check(input.description.toLowerCase().includes(keyword), 'Focus keyword appears in the meta description', 'Focus keyword is missing from the meta description');
    const first100Words = input.content.trim().split(/\s+/).slice(0, 100).join(' ').toLowerCase();
    check(first100Words.includes(keyword), 'Focus keyword appears early in the content', 'Focus keyword doesn\'t appear in the first ~100 words');
    check(/^#{2,3}\s+.*$/m.test(input.content) && new RegExp(`^#{2,3}\\s+.*${keyword}`, 'im').test(input.content), 'Focus keyword appears in a heading', 'Focus keyword doesn\'t appear in any heading');
  } else {
    warnings.push('No focus keyword set — checks for keyword placement are skipped');
  }

  const totalChecks = passed.length + warnings.length;
  const score = totalChecks > 0 ? Math.round((passed.length / totalChecks) * 100) : 0;

  return { passed, warnings, score };
}
