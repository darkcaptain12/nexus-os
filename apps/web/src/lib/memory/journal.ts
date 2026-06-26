import type { TimelineEntry, DailyJournal, JournalSection, TimeOfDay } from './types';
import { getMemoryStore } from './store';

const TIME_SECTIONS: { timeOfDay: TimeOfDay; startHour: number; endHour: number; label: string }[] = [
  { timeOfDay: 'morning', startHour: 6, endHour: 12, label: 'Sabah' },
  { timeOfDay: 'afternoon', startHour: 12, endHour: 18, label: 'Öğleden Sonra' },
  { timeOfDay: 'evening', startHour: 18, endHour: 23, label: 'Akşam' },
  { timeOfDay: 'night', startHour: 0, endHour: 6, label: 'Gece' },
];

export function generateDailyJournal(date?: string): DailyJournal {
  const store = getMemoryStore();
  const targetDate = date ?? new Date().toISOString().split('T')[0]!;
  const entries = store.getTimeline(targetDate, undefined, 200);

  const sections: JournalSection[] = TIME_SECTIONS.map((section) => {
    const sectionEntries = entries.filter((e) => {
      const hour = new Date(e.timestamp).getHours();
      if (section.startHour < section.endHour) {
        return hour >= section.startHour && hour < section.endHour;
      }
      return hour >= section.startHour || hour < section.endHour;
    });

    return {
      timeOfDay: section.timeOfDay,
      startHour: section.startHour,
      endHour: section.endHour,
      entries: sectionEntries,
      summary: summarizeSection(section.label, sectionEntries),
    };
  });

  const summary = generateDaySummary(targetDate, sections);

  const journal: DailyJournal = {
    id: crypto.randomUUID(),
    date: targetDate,
    sections,
    summary,
    generatedAt: new Date().toISOString(),
  };

  store.setJournal(targetDate, journal);
  return journal;
}

function summarizeSection(label: string, entries: TimelineEntry[]): string {
  if (entries.length === 0) return `${label}: Kayıt yok.`;

  const sources = new Set(entries.map((e) => e.source));
  const parts: string[] = [`${label}:`];

  if (sources.has('desktop')) {
    const desktopEntries = entries.filter((e) => e.source === 'desktop');
    parts.push(`${desktopEntries.length} masaüstü aktivitesi`);
  }
  if (sources.has('task')) {
    const taskEntries = entries.filter((e) => e.source === 'task');
    parts.push(`${taskEntries.length} görev güncellemesi`);
  }
  if (sources.has('decision')) {
    const decisionEntries = entries.filter((e) => e.source === 'decision');
    parts.push(`${decisionEntries.length} karar`);
  }
  if (sources.has('ai')) {
    parts.push('AI çalıştırıldı');
  }
  if (sources.has('system')) {
    parts.push('sistem olayları');
  }
  if (sources.has('note')) {
    const noteEntries = entries.filter((e) => e.source === 'note');
    parts.push(`${noteEntries.length} not`);
  }

  return parts.join(' · ');
}

function generateDaySummary(date: string, sections: JournalSection[]): string {
  const totalEntries = sections.reduce((sum, s) => sum + s.entries.length, 0);
  if (totalEntries === 0) {
    return `${formatDateTR(date)}: Kayıt yok.`;
  }

  const activeSections = sections.filter((s) => s.entries.length > 0);
  const sectionNames = activeSections.map((s) => {
    const labels: Record<TimeOfDay, string> = { morning: 'sabah', afternoon: 'öğleden sonra', evening: 'akşam', night: 'gece' };
    return labels[s.timeOfDay];
  });

  return `${formatDateTR(date)}: ${totalEntries} kayıt. Aktif dönemler: ${sectionNames.join(', ')}.`;
}

function formatDateTR(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
}
