import { bookingRules } from '@/lib/config';

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

interface PriceBreakdownProps {
  nights: number;
  /** Nightly-rate subtotal, before fees/discount. Defaults to nights × nightly rate if omitted. */
  subtotalAmount?: number;
  additionalFeeAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  depositPaid?: boolean;
  balancePaid?: boolean;
  className?: string;
}

/** Reused on the booking form (estimate) and booking status pages (actuals). */
export function PriceBreakdown({
  nights,
  subtotalAmount,
  additionalFeeAmount = 0,
  discountAmount = 0,
  totalAmount,
  depositAmount,
  balanceAmount,
  depositPaid = false,
  balancePaid = false,
  className,
}: PriceBreakdownProps) {
  return (
    <dl className={`rounded-lg bg-corner-ivory p-4 text-sm ${className ?? ''}`}>
      <div className="flex justify-between py-1">
        <dt className="text-corner-muted">
          {nights} night{nights === 1 ? '' : 's'}
        </dt>
        <dd>{formatZar(subtotalAmount ?? totalAmount - additionalFeeAmount + discountAmount)}</dd>
      </div>
      {additionalFeeAmount > 0 && (
        <div className="flex justify-between py-1 text-corner-muted">
          <dt>{bookingRules.additionalFeeLabel}</dt>
          <dd>{formatZar(additionalFeeAmount)}</dd>
        </div>
      )}
      {discountAmount > 0 && (
        <div className="flex justify-between py-1 text-corner-success">
          <dt>{bookingRules.discountLabel}</dt>
          <dd>&minus;{formatZar(discountAmount)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-corner-stone py-1.5 mt-1 font-medium text-corner-charcoal">
        <dt>Total</dt>
        <dd>{formatZar(totalAmount)}</dd>
      </div>
      <div className="flex justify-between py-1 font-medium text-corner-charcoal">
        <dt>
          Deposit ({Math.round(bookingRules.depositRate * 100)}%)
          {depositPaid && <span className="ml-1.5 text-corner-success">&middot; paid</span>}
        </dt>
        <dd>{formatZar(depositAmount)}</dd>
      </div>
      <div className="flex justify-between py-1 text-corner-muted">
        <dt>
          Balance
          {balancePaid ? (
            <span className="ml-1.5 text-corner-success">&middot; paid</span>
          ) : depositPaid ? (
            <span className="ml-1.5">&middot; due later</span>
          ) : (
            <span className="ml-1.5">&middot; due after deposit</span>
          )}
        </dt>
        <dd>{formatZar(balanceAmount)}</dd>
      </div>
    </dl>
  );
}
