import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../src/lib/memory/store';
import { generateDailyJournal } from '../src/lib/memory/journal';
import { summarizeActivity } from '../src/lib/memory/summarizer';

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('adds and retrieves timeline entries', () => {
    store.addTimelineEntry({
      source: 'task',
      title: 'Görev tamamlandı',
      description: 'Test görevi',
      timestamp: new Date().toISOString(),
    });
    const entries = store.getTimeline();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.source).toBe('task');
  });

  it('filters timeline by date', () => {
    store.addTimelineEntry({
      source: 'task',
      title: 'Today',
      description: '',
      timestamp: '2026-06-25T10:00:00Z',
    });
    store.addTimelineEntry({
      source: 'task',
      title: 'Yesterday',
      description: '',
      timestamp: '2026-06-24T10:00:00Z',
    });
    const entries = store.getTimeline('2026-06-25');
    expect(entries).toHaveLength(1);
    expect(entries[0]!.title).toBe('Today');
  });

  it('filters timeline by source', () => {
    store.addTimelineEntry({ source: 'task', title: 'Task', description: '', timestamp: new Date().toISOString() });
    store.addTimelineEntry({ source: 'note', title: 'Note', description: '', timestamp: new Date().toISOString() });
    expect(store.getTimeline(undefined, 'task')).toHaveLength(1);
  });

  it('adds and retrieves decisions', () => {
    store.addDecision({
      title: 'Use TypeScript',
      description: 'All code must be TypeScript',
      category: 'technical',
      reason: 'Type safety',
      impact: 'high',
      timestamp: new Date().toISOString(),
      source: 'architecture',
    });
    const decisions = store.getDecisions();
    expect(decisions).toHaveLength(1);
    expect(decisions[0]!.title).toBe('Use TypeScript');
  });

  it('decision also creates timeline entry', () => {
    store.addDecision({
      title: 'Test Decision',
      description: 'Test',
      category: 'user',
      reason: 'Testing',
      impact: 'low',
      timestamp: new Date().toISOString(),
      source: 'test',
    });
    const entries = store.getTimeline(undefined, 'decision');
    expect(entries).toHaveLength(1);
  });

  it('stores and retrieves journals', () => {
    const journal = {
      id: '1',
      date: '2026-06-25',
      sections: [],
      summary: 'Test summary',
      generatedAt: new Date().toISOString(),
    };
    store.setJournal('2026-06-25', journal);
    expect(store.getJournal('2026-06-25')).toEqual(journal);
    expect(store.getJournal('2026-06-24')).toBeNull();
  });

  it('adds project notes', () => {
    store.addProjectNote('p1', 'First note');
    store.addProjectNote('p1', 'Second note');
    expect(store.getProjectNotes('p1')).toHaveLength(2);
    expect(store.getProjectNotes('p2')).toHaveLength(0);
  });

  it('searches by keyword', () => {
    store.addTimelineEntry({ source: 'task', title: 'Deploy production', description: 'Ship it', timestamp: new Date().toISOString() });
    store.addTimelineEntry({ source: 'note', title: 'Meeting notes', description: 'Discussed roadmap', timestamp: new Date().toISOString() });
    const result = store.search({ keyword: 'deploy' });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.title).toBe('Deploy production');
  });

  it('searches by source', () => {
    store.addTimelineEntry({ source: 'task', title: 'A', description: '', timestamp: new Date().toISOString() });
    store.addTimelineEntry({ source: 'note', title: 'B', description: '', timestamp: new Date().toISOString() });
    const result = store.search({ source: 'note' });
    expect(result.entries).toHaveLength(1);
  });

  it('searches by date range', () => {
    store.addTimelineEntry({ source: 'task', title: 'Old', description: '', timestamp: '2026-06-20T10:00:00Z' });
    store.addTimelineEntry({ source: 'task', title: 'New', description: '', timestamp: '2026-06-25T10:00:00Z' });
    const result = store.search({ dateFrom: '2026-06-24' });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.title).toBe('New');
  });

  it('reports stats', () => {
    store.addTimelineEntry({ source: 'task', title: 'X', description: '', timestamp: new Date().toISOString() });
    store.addDecision({ title: 'Y', description: '', category: 'user', reason: '', impact: 'low', timestamp: new Date().toISOString(), source: '' });
    const stats = store.getStats();
    expect(stats.timelineEntries).toBe(2);
    expect(stats.decisions).toBe(1);
  });

  it('clears all data', () => {
    store.addTimelineEntry({ source: 'task', title: 'X', description: '', timestamp: new Date().toISOString() });
    store.clear();
    expect(store.getStats().timelineEntries).toBe(0);
  });
});

describe('Journal Generator', () => {
  it('generates empty journal for date with no entries', () => {
    const journal = generateDailyJournal('2099-01-01');
    expect(journal.date).toBe('2099-01-01');
    expect(journal.sections).toHaveLength(4);
    expect(journal.summary).toContain('Kayıt yok');
  });
});

describe('Activity Summarizer', () => {
  it('generates summary for empty entries', () => {
    const summary = summarizeActivity(
      '2026-06-25T09:00:00Z',
      '2026-06-25T10:00:00Z',
      [],
    );
    expect(summary.text).toContain('aktivite yok');
    expect(summary.focusScore).toBe(0);
  });

  it('generates summary with entries', () => {
    const summary = summarizeActivity(
      '2026-06-25T09:00:00Z',
      '2026-06-25T10:00:00Z',
      [
        { id: '1', source: 'desktop', title: 'VS Code', description: 'Coding', timestamp: '2026-06-25T09:15:00Z', metadata: { app: 'VS Code' } },
        { id: '2', source: 'desktop', title: 'Chrome', description: 'Browsing', timestamp: '2026-06-25T09:30:00Z', metadata: { app: 'Chrome' } },
      ],
    );
    expect(summary.text).toContain('masaüstü aktivitesi');
    expect(summary.topApps.length).toBeGreaterThan(0);
  });
});
