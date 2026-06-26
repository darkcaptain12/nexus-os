'use client';

import { Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export function DashboardHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      <ThemeToggle />
    </header>
  );
}
