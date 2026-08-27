import { bookingRules, pricingConfig } from '@/lib/config';

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

interface PriceBreakdownProps {
  nights: number;
  /** Nightly-rate subtotal, before fees/discount. Defaults to a derived value if omitted. */
  subtotalAmount?: number;
  cleaningFeeAmount?: number;
  serviceFeeAmount?: number;
  discountAmount?: number;
  securityDepositAmount?: number;
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
  cleaningFeeAmount = 0,
  serviceFeeAmount = 0,
  discountAmount = 0,
  securityDepositAmount = 0,
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
        <dd>
          {formatZar(
            subtotalAmount ?? totalAmount - cleaningFeeAmount - serviceFeeAmount + discountAmount,
          )}
        </dd>
      </div>
      {cleaningFeeAmount > 0 && (
        <div className="flex justify-between py-1 text-corner-muted">
          <dt>Cleaning fee</dt>
          <dd>{formatZar(cleaningFeeAmount)}</dd>
        </div>
      )}
      {serviceFeeAmount > 0 && (
        <div className="flex justify-between py-1 text-corner-muted">
          <dt>Service fee</dt>
          <dd>{formatZar(serviceFeeAmount)}</dd>
        </div>
      )}
      {discountAmount > 0 && (
        <div className="flex justify-between py-1 text-corner-success">
          <dt>{pricingConfig.discountLabel}</dt>
          <dd>&minus;{formatZar(discountAmount)}</dd>
        </div>
      )}
      <div className="mt-1 flex justify-between border-t border-corner-stone py-1.5 font-medium text-corner-charcoal">
        <dt>Total accommodation price</dt>
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
      {securityDepositAmount > 0 && (
        <div className="mt-1 flex justify-between border-t border-corner-stone py-1.5 text-corner-muted">
          <dt>Security deposit (refundable, paid separately)</dt>
          <dd>{formatZar(securityDepositAmount)}</dd>
        </div>
      )}
      <p className="mt-2 text-xs text-corner-muted">Prices shown in {bookingRules.currency}.</p>
    </dl>
  );
}
