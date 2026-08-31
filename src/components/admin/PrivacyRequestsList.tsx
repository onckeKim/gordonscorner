'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PrivacyRequest, PrivacyRequestStatus } from '@/types/database';

const STATUS_OPTIONS: PrivacyRequestStatus[] = ['new', 'in_progress', 'completed', 'rejected'];

const TYPE_LABEL: Record<PrivacyRequest['request_type'], string> = {
  export: 'Export',
  correction: 'Correction',
  deletion: 'Deletion',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PrivacyRequestsList({ requests }: { requests: PrivacyRequest[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function updateStatus(id: string, status: PrivacyRequestStatus) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/privacy-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote: notes[id] }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) {
    return <p className="text-sm text-corner-muted">No privacy requests.</p>;
  }

  return (
    <div className="space-y-4">
      {requests.map((r) => (
        <div key={r.id} className="rounded-xl2 border border-corner-border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {TYPE_LABEL[r.request_type]} — {r.name}{' '}
                <span className="font-normal text-corner-muted">({r.email})</span>
              </p>
              <p className="text-xs text-corner-muted">Submitted {formatDateTime(r.created_at)}</p>
            </div>
            <span className="rounded-full bg-corner-bg px-3 py-1 text-xs font-medium capitalize text-corner-ink">
              {r.status.replace('_', ' ')}
            </span>
          </div>

          {r.details && (
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-corner-bg px-4 py-3 text-sm text-corner-ink">
              {r.details}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Admin note (optional)"
              defaultValue={r.admin_note ?? ''}
              onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
              className="input flex-1 text-sm"
            />
            {STATUS_OPTIONS.filter((s) => s !== r.status).map((s) => (
              <button
                key={s}
                disabled={busyId === r.id}
                onClick={() => updateStatus(r.id, s)}
                className="rounded-full border border-corner-border px-3 py-1.5 text-xs font-medium capitalize hover:bg-corner-bg disabled:opacity-50"
              >
                Mark {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
