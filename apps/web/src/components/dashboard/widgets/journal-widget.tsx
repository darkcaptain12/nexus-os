'use client';

import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { WidgetShell, WidgetEmpty } from './widget-shell';

interface JournalData {
  date: string;
  sections: { timeOfDay: string; summary: string; entries: unknown[] }[];
  summary: string;
}

const TIME_LABELS: Record<string, string> = {
  morning: 'Sabah',
  afternoon: 'Öğleden Sonra',
  evening: 'Akşam',
  night: 'Gece',
};

const TIME_ICONS: Record<string, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌆',
  night: '🌙',
};

export function JournalWidget() {
  const [journal, setJournal] = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJournal() {
      try {
        const res = await fetch('/api/memory/journal');
        const data = await res.json();
        setJournal(data);
      } catch {
        setJournal(null);
      } finally {
        setLoading(false);
      }
    }
    fetchJournal();
  }, []);

  if (loading) {
    return (
      <WidgetShell title="Günlük" icon={<BookOpen className="h-4 w-4" />}>
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </WidgetShell>
    );
  }

  if (!journal) {
    return (
      <WidgetShell title="Günlük" icon={<BookOpen className="h-4 w-4" />}>
        <WidgetEmpty icon={<BookOpen className="h-8 w-8" />} message="Günlük oluşturulamadı" />
      </WidgetShell>
    );
  }

  const activeSections = journal.sections.filter((s) => s.entries.length > 0);

  return (
    <WidgetShell title="Günlük" icon={<BookOpen className="h-4 w-4" />}>
      <p className="mb-3 text-xs text-muted-foreground">{journal.summary}</p>
      {activeSections.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bugün henüz kayıt yok.</p>
      ) : (
        <div className="space-y-2">
          {activeSections.map((section) => (
            <div key={section.timeOfDay} className="rounded-lg bg-muted/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span>{TIME_ICONS[section.timeOfDay]}</span>
                <span className="text-sm font-medium text-foreground">
                  {TIME_LABELS[section.timeOfDay] ?? section.timeOfDay}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {section.entries.length} kayıt
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{section.summary}</p>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
