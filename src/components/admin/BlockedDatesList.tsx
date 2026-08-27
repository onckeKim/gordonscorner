'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BlockedDateRange } from '@/types/database';

export function BlockedDatesList({ blockedDates }: { blockedDates: BlockedDateRange[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    await fetch(`/api/admin/blocked-dates/${id}`, { method: 'DELETE' });
    router.refresh();
    setBusyId(null);
  }

  if (blockedDates.length === 0) {
    return <p className="text-sm text-corner-muted">No manual blocks.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {blockedDates.map((b) => (
        <li key={b.id} className="flex items-center justify-between border-t border-corner-border pt-2 first:border-t-0 first:pt-0">
          <span>
            {b.start_date} &rarr; {b.end_date}
            {b.reason ? <span className="text-corner-muted"> — {b.reason}</span> : null}
          </span>
          <button
            disabled={busyId === b.id}
            onClick={() => remove(b.id)}
            className="text-xs text-corner-danger hover:underline"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
