import clsx from 'clsx';

/** Single skeleton block. Purely decorative — wrap usages in a labelled loading region. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx('animate-pulse rounded-md bg-corner-stone/60 motion-reduce:animate-none', className)}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('card space-y-4', className)}>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-4 w-1/2" />
      <SkeletonText lines={2} />
    </div>
  );
}

/**
 * Wraps skeleton content in an accessible loading region: screen readers
 * announce "Loading <label>" once, rather than reading the decorative
 * skeleton shapes.
 */
export function LoadingRegion({
  label = 'Loading',
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-label={label}>
      {children}
    </div>
  );
}
