import { describe, expect, it } from 'vitest';
import { computeReadability, computeSeoChecks } from './score';

describe('computeReadability', () => {
  it('returns zero/very difficult for empty content', () => {
    const result = computeReadability('');
    expect(result.fleschScore).toBe(0);
    expect(result.label).toBe('Very difficult');
    expect(result.wordCount).toBe(0);
  });

  it('counts words and sentences from plain text', () => {
    const result = computeReadability('This is a short sentence. Here is another one.');
    expect(result.wordCount).toBe(9);
    expect(result.sentenceCount).toBe(2);
  });

  it('strips heading and list markers before counting', () => {
    const result = computeReadability('## A heading\n\n- one\n- two');
    // "A heading one two" -> 4 words, no terminal punctuation so 1 "sentence".
    expect(result.wordCount).toBe(4);
    expect(result.sentenceCount).toBe(1);
  });

  it('scores short, simple sentences as easier than long, complex ones', () => {
    const simple = computeReadability('The cat sat. The dog ran. We had fun.');
    const complex = computeReadability(
      'The extraordinarily sophisticated accommodation facilitates unparalleled relaxation opportunities for discerning international travelers seeking exceptional hospitality experiences.',
    );
    expect(simple.fleschScore).toBeGreaterThan(complex.fleschScore);
  });

  it('keeps the score within the documented 0-100 bounds', () => {
    const result = computeReadability('Word. '.repeat(200));
    expect(result.fleschScore).toBeGreaterThanOrEqual(0);
    expect(result.fleschScore).toBeLessThanOrEqual(100);
  });
});

const baseInput = {
  title: 'A reasonably-sized title about the local area guide',
  description:
    'A meta description that sits comfortably inside the recommended one hundred and twenty to one hundred and sixty character range for search engines.',
  content: 'word '.repeat(320) + '[Accommodation](/accommodation)',
  focusKeyword: 'local area guide',
  featuredImageAlt: 'A scenic photo of the local area',
  internalLinkCount: 1,
};

describe('computeSeoChecks', () => {
  it('passes every check for well-formed input containing the focus keyword everywhere expected', () => {
    let description = 'A local area guide covering attractions, restaurants and activities within easy reach';
    while (description.length < 120) description += ' of the property';
    expect(description.length).toBeLessThanOrEqual(160); // sanity check on the fixture itself

    const input = {
      ...baseInput,
      title: 'The Complete Local Area Guide for Weekend Visitors',
      description,
      content: `## Local area guide overview\n\n${'local area guide details word '.repeat(60)}[Accommodation](/accommodation)`,
    };
    const result = computeSeoChecks(input);
    expect(result.warnings).toEqual([]);
    expect(result.score).toBe(100);
  });

  it('flags a missing title', () => {
    const result = computeSeoChecks({ ...baseInput, title: '' });
    expect(result.warnings).toContain('Missing a title');
  });

  it('flags a title that is too short', () => {
    const result = computeSeoChecks({ ...baseInput, title: 'Short' });
    expect(result.warnings.some((w) => w.includes('Title is'))).toBe(true);
  });

  it('flags a missing meta description', () => {
    const result = computeSeoChecks({ ...baseInput, description: '' });
    expect(result.warnings).toContain('Missing a meta description');
  });

  it('flags thin content under 300 words', () => {
    const result = computeSeoChecks({ ...baseInput, content: 'word '.repeat(10) });
    expect(result.warnings.some((w) => w.includes('words'))).toBe(true);
  });

  it('flags zero internal links', () => {
    const result = computeSeoChecks({ ...baseInput, internalLinkCount: 0 });
    expect(result.warnings.some((w) => w.includes('internal link'))).toBe(true);
  });

  it('flags missing featured image alt text', () => {
    const result = computeSeoChecks({ ...baseInput, featuredImageAlt: '' });
    expect(result.warnings).toContain('Featured image is missing alt text');
  });

  it('notes when no focus keyword is set, skipping keyword-placement checks', () => {
    const result = computeSeoChecks({ ...baseInput, focusKeyword: '' });
    expect(result.warnings).toContain('No focus keyword set — checks for keyword placement are skipped');
  });

  it('flags a focus keyword missing from the title', () => {
    const result = computeSeoChecks({ ...baseInput, title: 'Something else entirely as a title', focusKeyword: 'whale watching' });
    expect(result.warnings.some((w) => w.includes('missing from the title'))).toBe(true);
  });

  it('produces a score between 0 and 100', () => {
    const result = computeSeoChecks(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
