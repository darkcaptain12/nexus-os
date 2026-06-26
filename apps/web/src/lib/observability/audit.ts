import { isSupabaseConfigured } from '@/lib/supabase/health';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.signup'
  | 'user.password_reset'
  | 'action.executed'
  | 'action.approved'
  | 'action.rejected'
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'integration.connected'
  | 'integration.disconnected'
  | 'memory.created'
  | 'decision.created'
  | 'desktop.synced';

export interface AuditEntry {
  action: AuditAction;
  userId?: string;
  details: Record<string, unknown>;
  timestamp: string;
}

const auditLog: AuditEntry[] = [];

export function audit(action: AuditAction, details: Record<string, unknown> = {}, userId?: string): void {
  const entry: AuditEntry = {
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
  };

  auditLog.push(entry);
  if (auditLog.length > 10000) {
    auditLog.splice(0, auditLog.length - 5000);
  }

  if (isSupabaseConfigured()) {
    persistAuditEntry(entry).catch(() => {});
  }
}

export function getAuditLog(limit = 50): AuditEntry[] {
  return auditLog.slice(-limit).reverse();
}

async function persistAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      table_name: 'app_events',
      action: entry.action,
      new_data: entry.details,
      performed_by: entry.userId ?? 'system',
    });
  } catch {
    // Audit persistence failure is non-fatal
  }
}
