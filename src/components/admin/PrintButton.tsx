'use client';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary text-xs print:hidden">
      Print / save as PDF
    </button>
  );
}
