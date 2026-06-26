import type { ActivitySummary, TimelineEntry } from './types';
import { getMemoryStore } from './store';

export function summarizeActivity(
  periodStart: string,
  periodEnd: string,
  entries: TimelineEntry[],
): ActivitySummary {
  const store = getMemoryStore();

  if (entries.length === 0) {
    const summary: ActivitySummary = {
      id: '',
      periodStart,
      periodEnd,
      text: 'Bu dönemde kayıtlı aktivite yok.',
      topApps: [],
      focusScore: 0,
      contextSwitches: 0,
      generatedAt: new Date().toISOString(),
    };
    return store.addActivitySummary(summary);
  }

  const appCounts = new Map<string, number>();
  const sources = new Set<string>();
  let switches = 0;
  let prevSource = '';

  for (const entry of entries) {
    sources.add(entry.source);
    if (entry.source === 'desktop' && entry.metadata?.['app']) {
      const app = entry.metadata['app'] as string;
      appCounts.set(app, (appCounts.get(app) ?? 0) + 1);
    }
    if (prevSource && prevSource !== entry.source) switches++;
    prevSource = entry.source;
  }

  const topApps = [...appCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([app]) => app);

  const startTime = formatTime(periodStart);
  const endTime = formatTime(periodEnd);
  const lines: string[] = [`${startTime}–${endTime}`];

  if (topApps.length > 0) {
    lines.push(`Ağırlıklı: ${topApps.slice(0, 3).join(', ')}.`);
  }

  const desktopCount = entries.filter((e) => e.source === 'desktop').length;
  const taskCount = entries.filter((e) => e.source === 'task').length;
  const noteCount = entries.filter((e) => e.source === 'note').length;

  if (desktopCount > 0) lines.push(`${desktopCount} masaüstü aktivitesi.`);
  if (taskCount > 0) lines.push(`${taskCount} görev güncellemesi.`);
  if (noteCount > 0) lines.push(`${noteCount} not eklendi.`);

  const focusScore = Math.max(0, Math.min(100, 70 - switches * 5 + topApps.length * 5));

  const summary: ActivitySummary = {
    id: '',
    periodStart,
    periodEnd,
    text: lines.join('\n'),
    topApps,
    focusScore,
    contextSwitches: switches,
    generatedAt: new Date().toISOString(),
  };

  return store.addActivitySummary(summary);
}

export function summarizeHourlyActivity(date?: string): ActivitySummary[] {
  const store = getMemoryStore();
  const targetDate = date ?? new Date().toISOString().split('T')[0]!;
  const allEntries = store.getTimeline(targetDate, undefined, 500);

  const hourBuckets = new Map<number, TimelineEntry[]>();
  for (const entry of allEntries) {
    const hour = new Date(entry.timestamp).getHours();
    const bucket = hourBuckets.get(hour) ?? [];
    bucket.push(entry);
    hourBuckets.set(hour, bucket);
  }

  const summaries: ActivitySummary[] = [];
  for (const [hour, entries] of [...hourBuckets.entries()].sort((a, b) => a[0] - b[0])) {
    const periodStart = `${targetDate}T${String(hour).padStart(2, '0')}:00:00`;
    const periodEnd = `${targetDate}T${String(hour + 1).padStart(2, '0')}:00:00`;
    summaries.push(summarizeActivity(periodStart, periodEnd, entries));
  }

  return summaries;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
