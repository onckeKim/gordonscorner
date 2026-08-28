import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/admin';
import { PriceBreakdown } from '@/components/PriceBreakdown';
import { PrintButton } from '@/components/admin/PrintButton';
import { siteConfig } from '@/lib/config';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Print-friendly booking summary — open in a new tab, then use the browser's print dialog (Save as PDF works there too). */
export default async function BookingPrintSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const supabase = await createServerSupabaseClient();
  const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (!booking) notFound();

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', id)
    .eq('status', 'paid')
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto max-w-2xl bg-white p-4 print:p-0">
      <div className="flex items-center justify-between border-b border-corner-stone pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{siteConfig.propertyName}</h1>
          <p className="text-sm text-corner-muted">{siteConfig.address}</p>
        </div>
        <PrintButton />
      </div>

      <h2 className="mt-6 font-display text-xl font-semibold">Booking summary — {booking.reference ?? booking.id.slice(0, 8)}</h2>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="label">Guest</dt>
          <dd>{booking.guest_name}</dd>
        </div>
        <div>
          <dt className="label">Status</dt>
          <dd className="capitalize">{booking.status.replace(/_/g, ' ')}</dd>
        </div>
        <div>
          <dt className="label">Email</dt>
          <dd>{booking.guest_email}</dd>
        </div>
        <div>
          <dt className="label">Phone</dt>
          <dd>{booking.guest_phone ?? '—'}</dd>
        </div>
        <div>
          <dt className="label">Check-in</dt>
          <dd>{formatDate(booking.check_in)}</dd>
        </div>
        <div>
          <dt className="label">Check-out</dt>
          <dd>{formatDate(booking.check_out)}</dd>
        </div>
        <div>
          <dt className="label">Nights</dt>
          <dd>{booking.nights}</dd>
        </div>
        <div>
          <dt className="label">Guests</dt>
          <dd>{booking.guests_count}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <PriceBreakdown
          nights={booking.nights}
          subtotalAmount={booking.accommodation_subtotal ?? undefined}
          cleaningFeeAmount={booking.cleaning_fee_amount}
          serviceFeeAmount={booking.service_fee_amount}
          discountAmount={booking.discount_amount}
          taxAmount={booking.tax_amount}
          securityDepositAmount={booking.security_deposit_amount}
          totalAmount={booking.total_amount}
          depositAmount={booking.deposit_amount}
          balanceAmount={booking.balance_amount}
          currency={booking.currency}
          depositPaid={Boolean(booking.deposit_paid_at)}
          balancePaid={Boolean(booking.balance_paid_at)}
        />
      </div>

      {(payments ?? []).length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-lg font-semibold">Payments received</h3>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs uppercase text-corner-muted">
              <tr>
                <th className="py-1">Type</th>
                <th className="py-1">Amount</th>
                <th className="py-1">Date</th>
                <th className="py-1">Reference</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-t border-corner-stone">
                  <td className="py-1 capitalize">{p.type}</td>
                  <td className="py-1">
                    {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: booking.currency }).format(p.amount)}
                  </td>
                  <td className="py-1">{formatDate(p.paid_at ?? p.created_at)}</td>
                  <td className="py-1 text-corner-muted">{p.provider_reference ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {booking.admin_notes && (
        <div className="mt-6">
          <h3 className="font-display text-lg font-semibold">Internal notes</h3>
          <p className="mt-1 whitespace-pre-line text-sm text-corner-muted">{booking.admin_notes}</p>
        </div>
      )}

      <p className="mt-8 text-xs text-corner-muted">
        Generated {new Date().toLocaleString('en-ZA')} &middot; {siteConfig.contactEmail}
      </p>
    </div>
  );
}
