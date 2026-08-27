import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-corner-stone bg-corner-white/60 px-6 py-16 text-center ${className ?? ''}`}>
      <Icon aria-hidden className="h-8 w-8 text-corner-muted" />
      <p className="font-display text-xl font-medium text-corner-charcoal">{title}</p>
      {description && <p className="max-w-sm text-sm text-corner-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
