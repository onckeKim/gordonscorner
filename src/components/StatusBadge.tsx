import type { BookingStatus } from '@/types/database';

const STATUS_LABELS: Record<BookingStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  information_required: 'Information required',
  alternative_dates_proposed: 'Alternative dates proposed',
  accepted_awaiting_deposit: 'Awaiting deposit',
  deposit_processing: 'Deposit processing',
  confirmed: 'Confirmed',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  no_show: 'No-show',
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  draft: 'bg-stone-100 text-stone-600',
  submitted: 'bg-amber-100 text-amber-800',
  under_review: 'bg-amber-100 text-amber-800',
  information_required: 'bg-amber-100 text-amber-800',
  alternative_dates_proposed: 'bg-amber-100 text-amber-800',
  accepted_awaiting_deposit: 'bg-blue-100 text-blue-800',
  deposit_processing: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-stone-200 text-stone-700',
  cancelled: 'bg-stone-200 text-stone-700',
  checked_in: 'bg-corner-forest/10 text-corner-forest',
  checked_out: 'bg-stone-200 text-stone-700',
  no_show: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
