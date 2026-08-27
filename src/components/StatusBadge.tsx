import type { BookingStatus } from '@/types/database';

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_review: 'Pending review',
  info_requested: 'More info requested',
  dates_proposed: 'Alternative dates proposed',
  accepted: 'Awaiting deposit',
  deposit_paid: 'Deposit paid',
  confirmed: 'Confirmed',
  balance_paid: 'Fully paid',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending_review: 'bg-amber-100 text-amber-800',
  info_requested: 'bg-amber-100 text-amber-800',
  dates_proposed: 'bg-amber-100 text-amber-800',
  accepted: 'bg-blue-100 text-blue-800',
  deposit_paid: 'bg-emerald-100 text-emerald-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  balance_paid: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-stone-200 text-stone-700',
  cancelled: 'bg-stone-200 text-stone-700',
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
