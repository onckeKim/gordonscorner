/** Minimal, dependency-free CSV serialization — quotes/escapes per RFC 4180. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  function cell(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const header = columns.map(cell).join(',');
  const body = rows.map((row) => columns.map((col) => cell(row[col])).join(','));
  return [header, ...body].join('\r\n');
}
