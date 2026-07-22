import type {
  TimelineEntry,
  DailyJournal,
  DecisionEntry,
  ActivitySummary,
  MemorySource,
  MemorySearchQuery,
  MemorySearchResult,
} from './types';
import { persistTimelineEntry, persistDecisionEntry } from './memory-repository';
import { deferPersist } from '@/lib/persist-after';

// Memory god-node. globalThis hızlı erişim + Supabase write-through (Faz 2
// kalıcılık): add* çağrıları sync kalır (mevcut API korunur), arka planda
// Supabase'e yazılır (hata yutulur → globalThis fallback).

class MemoryStore {
  private timeline: TimelineEntry[] = [];
  private journals: Map<string, DailyJournal> = new Map();
  private decisions: DecisionEntry[] = [];
  private activitySummaries: ActivitySummary[] = [];
  private projectNotes: Map<string, string[]> = new Map();

  addTimelineEntry(entry: Omit<TimelineEntry, 'id'>): TimelineEntry {
    const full: TimelineEntry = { id: crypto.randomUUID(), ...entry };
    this.timeline.push(full);
    deferPersist(() => persistTimelineEntry(full)); // write-through
    return full;
  }

  addTimelineEntries(entries: Omit<TimelineEntry, 'id'>[]): TimelineEntry[] {
    return entries.map((e) => this.addTimelineEntry(e));
  }

  getTimeline(date?: string, source?: MemorySource, limit = 50): TimelineEntry[] {
    let entries = [...this.timeline];
    if (date) {
      entries = entries.filter((e) => e.timestamp.startsWith(date));
    }
    if (source) {
      entries = entries.filter((e) => e.source === source);
    }
    return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }

  addDecision(entry: Omit<DecisionEntry, 'id'>): DecisionEntry {
    const full: DecisionEntry = { id: crypto.randomUUID(), ...entry };
    this.decisions.push(full);
    deferPersist(() => persistDecisionEntry(full)); // write-through
    this.addTimelineEntry({
      source: 'decision',
      title: `Karar: ${full.title}`,
      description: full.description,
      timestamp: full.timestamp,
      metadata: { decisionId: full.id, category: full.category, impact: full.impact },
    });
    return full;
  }

  getDecisions(category?: string, limit = 20): DecisionEntry[] {
    let entries = [...this.decisions];
    if (category) {
      entries = entries.filter((d) => d.category === category);
    }
    return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }

  setJournal(date: string, journal: DailyJournal): void {
    this.journals.set(date, journal);
  }

  getJournal(date: string): DailyJournal | null {
    return this.journals.get(date) ?? null;
  }

  getRecentJournals(count = 7): DailyJournal[] {
    return [...this.journals.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, count);
  }

  addActivitySummary(summary: Omit<ActivitySummary, 'id'>): ActivitySummary {
    const full: ActivitySummary = { id: crypto.randomUUID(), ...summary };
    this.activitySummaries.push(full);
    return full;
  }

  getActivitySummaries(date?: string, limit = 24): ActivitySummary[] {
    let entries = [...this.activitySummaries];
    if (date) {
      entries = entries.filter((s) => s.periodStart.startsWith(date));
    }
    return entries.sort((a, b) => b.periodStart.localeCompare(a.periodStart)).slice(0, limit);
  }

  addProjectNote(projectId: string, note: string): void {
    const notes = this.projectNotes.get(projectId) ?? [];
    notes.push(note);
    this.projectNotes.set(projectId, notes);
  }

  getProjectNotes(projectId: string): string[] {
    return this.projectNotes.get(projectId) ?? [];
  }

  search(query: MemorySearchQuery): MemorySearchResult {
    let entries = [...this.timeline];

    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      entries = entries.filter(
        (e) => e.title.toLowerCase().includes(kw) || e.description.toLowerCase().includes(kw),
      );
    }
    if (query.source) {
      entries = entries.filter((e) => e.source === query.source);
    }
    if (query.dateFrom) {
      entries = entries.filter((e) => e.timestamp >= query.dateFrom!);
    }
    if (query.dateTo) {
      entries = entries.filter((e) => e.timestamp <= query.dateTo!);
    }

    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return { entries: entries.slice(0, 50), total: entries.length, query };
  }

  getStats() {
    return {
      timelineEntries: this.timeline.length,
      journals: this.journals.size,
      decisions: this.decisions.length,
      activitySummaries: this.activitySummaries.length,
      projects: this.projectNotes.size,
    };
  }

  clear(): void {
    this.timeline = [];
    this.journals.clear();
    this.decisions = [];
    this.activitySummaries = [];
    this.projectNotes.clear();
  }
}

// globalThis üzerinden singleton: dev modda HMR ve bundle-per-entry izolasyonuna dayanıklı
const g = globalThis as unknown as { __apexMemoryStore?: MemoryStore };

export function getMemoryStore(): MemoryStore {
  if (!g.__apexMemoryStore) {
    g.__apexMemoryStore = new MemoryStore();
  }
  return g.__apexMemoryStore;
}

export { MemoryStore };
