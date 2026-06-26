'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Brain,
  Database,
  GitBranch,
  TrendingUp,
  ShoppingBag,
  Calendar,
  Bell,
  Settings,
  X,
  LogOut,
  Zap,
  Plug,
  Activity,
} from 'lucide-react';
import { signOut } from '@/lib/auth-actions';
import { cn } from '@/lib/utils';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { href: '/gorevler', label: 'Görevler', icon: CheckSquare, active: true },
  { href: '/projeler', label: 'Projeler', icon: FolderKanban, active: true },
  { href: '/ai', label: 'Yapay Zeka', icon: Brain, active: false },
  { href: '/bellek', label: 'Bellek', icon: Database, active: true },
  { href: '/actions', label: 'Eylemler', icon: Zap, active: true },
  { href: '/integrations', label: 'Entegrasyonlar', icon: Plug, active: true },
  { href: '/workflows', label: 'İş Akışları', icon: GitBranch, active: true },
  { href: '/trading', label: 'Trading', icon: TrendingUp, active: false },
  { href: '/e-ticaret', label: 'E-Ticaret', icon: ShoppingBag, active: false },
  { href: '/takvim', label: 'Takvim', icon: Calendar, active: false },
  { href: '/bildirimler', label: 'Bildirimler', icon: Bell, active: true },
  { href: '/system', label: 'Sistem', icon: Activity, active: true },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings, active: true },
];

export function DashboardSidebar({ open, onClose, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar-background transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight text-sidebar-foreground">
            NEXUS OS
          </Link>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            aria-label="Menüyü kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {!item.active && (
                  <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Yakında
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
