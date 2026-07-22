'use client';

import { useRouter } from 'next/navigation';
import { useRealtime } from '@/hooks/use-realtime';

export function DashboardRefresh() {
  const router = useRouter();

  useRealtime({ table: 'tasks' }, () => {
    router.refresh();
  });

  useRealtime({ table: 'goals' }, () => {
    router.refresh();
  });

  useRealtime({ table: 'projects' }, () => {
    router.refresh();
  });

  return null;
}
