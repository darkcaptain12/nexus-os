'use client';

import { useState, useEffect } from 'react';
import { Database, Search, BookOpen, Clock } from 'lucide-react';

interface MemoryStats {
  timelineEntries: number;
  journals: number;
  decisions: number;
  activitySummaries: number;
  projects: number;
}

interface TimelineEntry {
  id: string;
  source: string;
  title: string;
  description: string;
  timestamp: string;
}

const SOURCE_LABELS: Record<string, string> = {
  desktop: 'Masaüstü', task: 'Görev', decision: 'Karar', note: 'Not',
  ai: 'AI', system: 'Sistem', goal: 'Hedef', calendar: 'Takvim',
  journal: 'Günlük', project: 'Proje', notification: 'Bildirim',
};

export default function MemoryPage() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TimelineEntry[] | null>(null);

  useEffect(() => {
    fetch('/api/memory/timeline?limit=20')
      .then((r) => r.json())
      .then((d) => { setStats(d.stats); setEntries(d.entries); })
      .catch(() => {});
  }, []);

  async function handleSearch() {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    try {
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.entries);
    } catch {
      setSearchResults([]);
    }
  }

  const displayEntries = searchResults ?? entries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bellek</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kişisel hafıza sistemi</p>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Kayıtlar', value: stats.timelineEntries, icon: Clock },
            { label: 'Günlükler', value: stats.journals, icon: BookOpen },
            { label: 'Kararlar', value: stats.decisions, icon: Database },
            { label: 'Özetler', value: stats.activitySummaries, icon: Database },
            { label: 'Projeler', value: stats.projects, icon: Database },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
              <s.icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Hafızada ara..."
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleSearch}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Search className="h-4 w-4" />
          Ara
        </button>
      </div>

      {searchResults !== null && (
        <p className="text-xs text-muted-foreground">
          &quot;{searchQuery}&quot; için {searchResults.length} sonuç bulundu
        </p>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-foreground">
          {searchResults ? 'Arama Sonuçları' : 'Son Kayıtlar'}
        </h2>
        {displayEntries.length === 0 ? (
          <div className="py-8 text-center">
            <Database className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {searchResults ? 'Sonuç bulunamadı' : 'Henüz hafıza kaydı yok'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayEntries.map((entry) => (
              <div key={entry.id} className="flex gap-3 rounded-lg bg-muted/50 px-3 py-2">
                <div className="shrink-0 pt-1">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString('tr-TR')}
                    </span>
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      {SOURCE_LABELS[entry.source] ?? entry.source}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground">{entry.title}</p>
                  {entry.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
