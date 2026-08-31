import { describe, expect, it } from 'vitest';
import { slugify, isValidSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates a normal title', () => {
    expect(slugify('Whale Watching Season Guide')).toBe('whale-watching-season-guide');
  });

  it('strips punctuation', () => {
    expect(slugify("Guest's Guide: What to Pack!")).toBe('guest-s-guide-what-to-pack');
  });

  it('collapses multiple separators into one hyphen', () => {
    expect(slugify('Hermanus  --  Weekend   Guide')).toBe('hermanus-weekend-guide');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --Best Time to Visit--  ')).toBe('best-time-to-visit');
  });

  it('truncates very long titles to 80 characters', () => {
    const long = 'a '.repeat(100).trim();
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });

  it('strips accented characters to their base form', () => {
    expect(slugify('Café Résumé')).toBe('cafe-resume');
  });
});

describe('isValidSlug', () => {
  it('accepts a well-formed slug', () => {
    expect(isValidSlug('whale-watching-season-guide')).toBe(true);
  });

  it('accepts a single word', () => {
    expect(isValidSlug('faq')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidSlug('')).toBe(false);
  });

  it('rejects uppercase letters', () => {
    expect(isValidSlug('Whale-Watching')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(isValidSlug('whale watching')).toBe(false);
  });

  it('rejects a leading or trailing hyphen', () => {
    expect(isValidSlug('-whale-watching')).toBe(false);
    expect(isValidSlug('whale-watching-')).toBe(false);
  });

  it('rejects double hyphens', () => {
    expect(isValidSlug('whale--watching')).toBe(false);
  });

  it('rejects a slug over 80 characters', () => {
    expect(isValidSlug('a-'.repeat(45))).toBe(false);
  });

  it('accepts every output of slugify() (round-trip)', () => {
    const inputs = ['Whale Watching Season Guide', "Guest's Guide: What to Pack!", 'Café Résumé'];
    for (const input of inputs) {
      expect(isValidSlug(slugify(input))).toBe(true);
    }
  });
});
