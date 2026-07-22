import { Bell, BellRing } from 'lucide-react';
import { getNotifications } from '@/lib/mobile/notification-center';

export const metadata = { title: 'Bildirimler — NEXUS OS' };

const SEV_COLOR: Record<string, string> = {
  info: 'text-blue-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
};
const CAT_LABEL: Record<string, string> = {
  trading: 'Trading',
  commerce: 'Commerce',
  agent: 'Agent',
  desktop: 'Desktop',
  memory: 'Bellek',
  workflow: 'İş Akışı',
  approval: 'Onay',
  risk: 'Risk',
};

export default function NotificationsPage() {
  const notifications = getNotifications(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="text-primary h-6 w-6" />
        <div>
          <h1 className="text-foreground text-2xl font-bold">Bildirimler</h1>
          <p className="text-muted-foreground text-sm">{notifications.length} bildirim</p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-20 text-center">
          <BellRing className="text-muted-foreground/30 mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">Henüz bildirim yok.</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Trading/Commerce/Agent olayları burada görünür.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className="border-border bg-card rounded-xl border p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-foreground flex items-center gap-2 text-sm font-medium">
                    {n.title}
                    {n.requiresApproval && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">
                        Onay gerekli
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{n.body}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-xs ${SEV_COLOR[n.severity] ?? 'text-muted-foreground'}`}>
                    {CAT_LABEL[n.category] ?? n.category}
                  </span>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    {new Date(n.createdAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
