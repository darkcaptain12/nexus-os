import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WidgetShellProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function WidgetShell({ title, icon, children, className, action }: WidgetShellProps) {
  return (
    <section className={cn('rounded-xl border border-border bg-card p-5', className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function WidgetEmpty({ icon, message, submessage }: { icon: ReactNode; message: string; submessage?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <span className="mb-2 text-muted-foreground/40">{icon}</span>
      <p className="text-sm text-muted-foreground">{message}</p>
      {submessage && <p className="mt-1 text-xs text-muted-foreground">{submessage}</p>}
    </div>
  );
}

export function WidgetLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  );
}

export function StatusBadge({ status, label }: { status: 'green' | 'yellow' | 'red'; label: string }) {
  const colors = {
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${colors[status]}`}>{label}</span>
  );
}

export function StatusRow({ label, status, statusLabel }: { label: string; status: 'green' | 'yellow' | 'red'; statusLabel: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <StatusBadge status={status} label={statusLabel} />
    </div>
  );
}
