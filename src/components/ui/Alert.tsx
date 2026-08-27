import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Variant = 'success' | 'error' | 'warning' | 'info';

const VARIANT_STYLES: Record<Variant, { icon: LucideIcon; classes: string; role: 'status' | 'alert' }> = {
  success: {
    icon: CheckCircle2,
    classes: 'border-corner-success/30 bg-corner-success/10 text-corner-success',
    role: 'status',
  },
  info: {
    icon: Info,
    classes: 'border-corner-forest/20 bg-corner-forest/5 text-corner-forest',
    role: 'status',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-corner-warning/30 bg-corner-warning/10 text-corner-warning',
    role: 'alert',
  },
  error: {
    icon: XCircle,
    classes: 'border-corner-error/30 bg-corner-error/10 text-corner-error',
    role: 'alert',
  },
};

interface AlertProps {
  variant: Variant;
  title: string;
  /** For errors, explain what to change — not just that something went wrong. */
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function Alert({ variant, title, description, action, className }: AlertProps) {
  const { icon: Icon, classes, role } = VARIANT_STYLES[variant];

  return (
    <div role={role} className={`flex gap-3 rounded-xl2 border p-4 text-sm ${classes} ${className ?? ''}`}>
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="opacity-90">{description}</p>}
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}
