import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('produces a header row and one row per record', () => {
    const csv = toCsv([{ a: '1', b: '2' }], ['a', 'b']);
    expect(csv).toBe('a,b\r\n1,2');
  });

  it('renders null/undefined cells as empty', () => {
    const csv = toCsv([{ a: null, b: undefined }], ['a', 'b']);
    expect(csv).toBe('a,b\r\n,');
  });

  it('quotes and escapes a value containing a comma', () => {
    const csv = toCsv([{ name: 'Smith, John' }], ['name']);
    expect(csv).toBe('name\r\n"Smith, John"');
  });

  it('quotes and escapes a value containing a double quote', () => {
    const csv = toCsv([{ note: 'He said "hi"' }], ['note']);
    expect(csv).toBe('note\r\n"He said ""hi"""');
  });

  it('quotes a value containing a newline', () => {
    const csv = toCsv([{ note: 'line1\nline2' }], ['note']);
    expect(csv).toBe('note\r\n"line1\nline2"');
  });

  it('does not quote plain values', () => {
    const csv = toCsv([{ ref: 'GC-2026-AB12' }], ['ref']);
    expect(csv).toBe('ref\r\nGC-2026-AB12');
  });

  it('only includes the requested columns, in order', () => {
    const csv = toCsv([{ a: '1', b: '2', c: '3' }], ['c', 'a']);
    expect(csv).toBe('c,a\r\n3,1');
  });
});
