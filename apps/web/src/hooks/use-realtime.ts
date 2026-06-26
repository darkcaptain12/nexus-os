'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface UseRealtimeOptions {
  table: string;
  event?: ChangeEvent | '*';
  filter?: string;
  enabled?: boolean;
}

export function useRealtime<T = Record<string, unknown>>(
  options: UseRealtimeOptions,
  onEvent: (payload: { eventType: ChangeEvent; new: T; old: T }) => void,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { table, event = '*', filter, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channelName = `realtime-${table}-${crypto.randomUUID().slice(0, 8)}`;

    const pgConfig: { event: '*' | ChangeEvent; schema: 'public'; table: string; filter?: string } = {
      event,
      schema: 'public',
      table,
    };
    if (filter) pgConfig.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', pgConfig, (payload) => {
        onEvent({
          eventType: payload.eventType as ChangeEvent,
          new: payload.new as T,
          old: payload.old as T,
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, event, filter, enabled]);
}

export function useRealtimeList<T extends { id: string }>(
  table: string,
  initialData: T[] = [],
  enabled = true,
): { data: T[]; lastUpdate: string | null } {
  const [data, setData] = useState<T[]>(initialData);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const handleEvent = useCallback(
    (payload: { eventType: ChangeEvent; new: T; old: T }) => {
      setLastUpdate(new Date().toISOString());

      switch (payload.eventType) {
        case 'INSERT':
          setData((prev) => [payload.new, ...prev]);
          break;
        case 'UPDATE':
          setData((prev) =>
            prev.map((item) => (item.id === payload.new.id ? payload.new : item)),
          );
          break;
        case 'DELETE':
          setData((prev) => prev.filter((item) => item.id !== payload.old.id));
          break;
      }
    },
    [],
  );

  useRealtime<T>({ table, enabled }, handleEvent);

  return { data, lastUpdate };
}
