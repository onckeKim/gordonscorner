'use client';

import { useEffect, useState } from 'react';
import type { Profile, ProfileRole } from '@/types/database';

export function TeamPanel({ currentUserId }: { currentUserId: string }) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/team');
    const data = await res.json();
    if (res.ok) setProfiles(data.profiles);
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(id: string, role: ProfileRole) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not update role.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">Team & roles</h2>
      <p className="mt-1 text-xs text-corner-muted">
        Admin has full access, including settings/content/team management. Staff can manage
        bookings, payments and the calendar. New accounts are created in the Supabase dashboard.
      </p>
      {error && <p className="mt-2 text-sm text-corner-error">{error}</p>}
      <ul className="mt-3 space-y-2 text-sm">
        {(profiles ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between border-t border-corner-stone pt-2 first:border-t-0 first:pt-0">
            <span>
              {p.email}
              {p.id === currentUserId && <span className="ml-2 text-xs text-corner-muted">(you)</span>}
            </span>
            <select
              className="input w-32 py-1 text-xs"
              value={p.role}
              disabled={busyId === p.id}
              onChange={(e) => changeRole(p.id, e.target.value as ProfileRole)}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </li>
        ))}
        {profiles === null && <p className="text-corner-muted">Loading…</p>}
        {profiles?.length === 0 && <p className="text-corner-muted">No portal users found.</p>}
      </ul>
    </div>
  );
}
