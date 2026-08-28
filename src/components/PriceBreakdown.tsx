function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
}

interface PriceBreakdownProps {
  nights: number;
  /** Nightly-rate subtotal, before fees/discount. Defaults to a derived value if omitted. */
  subtotalAmount?: number;
  cleaningFeeAmount?: number;
  serviceFeeAmount?: number;
  discountAmount?: number;
  discountLabel?: string;
  taxAmount?: number;
  securityDepositAmount?: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  /** Deposit as a percentage of the total, e.g. 50. Derived from amounts if omitted. */
  depositRatePercent?: number;
  currency?: string;
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
  discountLabel = 'Discount',
  taxAmount = 0,
  securityDepositAmount = 0,
  totalAmount,
  depositAmount,
  balanceAmount,
  depositRatePercent,
  currency = 'ZAR',
  depositPaid = false,
  balancePaid = false,
  className,
}: PriceBreakdownProps) {
  const formatZar = (amount: number) => formatAmount(amount, currency);
  const depositPercent = depositRatePercent ?? (totalAmount > 0 ? Math.round((depositAmount / totalAmount) * 100) : 50);
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
          <dt>{discountLabel}</dt>
          <dd>&minus;{formatZar(discountAmount)}</dd>
        </div>
      )}
      {taxAmount > 0 && (
        <div className="flex justify-between py-1 text-corner-muted">
          <dt>Tax</dt>
          <dd>{formatZar(taxAmount)}</dd>
        </div>
      )}
      <div className="mt-1 flex justify-between border-t border-corner-stone py-1.5 font-medium text-corner-charcoal">
        <dt>Total accommodation price</dt>
        <dd>{formatZar(totalAmount)}</dd>
      </div>
      <div className="flex justify-between py-1 font-medium text-corner-charcoal">
        <dt>
          Deposit ({depositPercent}%)
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
      <p className="mt-2 text-xs text-corner-muted">Prices shown in {currency}.</p>
    </dl>
  );
}
