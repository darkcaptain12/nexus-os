import type { ProjectMemory, DecisionEntry, TimelineEntry } from './types';
import { getMemoryStore } from './store';

export function getProjectMemory(projectId: string, projectName: string): ProjectMemory {
  const store = getMemoryStore();
  const allEntries = store.getTimeline(undefined, undefined, 500);
  const projectEntries = allEntries.filter(
    (e) => e.metadata?.['projectId'] === projectId || e.metadata?.['project'] === projectName,
  );

  const decisions = store.getDecisions().filter(
    (d) => d.metadata?.['projectId'] === projectId || d.source === projectName,
  );

  const notes = store.getProjectNotes(projectId);
  const relatedGoals = extractRelatedIds(projectEntries, 'goalId');
  const relatedTasks = extractRelatedIds(projectEntries, 'taskId');

  return {
    projectId,
    projectName,
    history: projectEntries,
    notes,
    decisions,
    relatedGoals,
    relatedTasks,
  };
}

export function addProjectDecision(
  projectId: string,
  projectName: string,
  title: string,
  description: string,
  reason: string,
  impact: DecisionEntry['impact'] = 'medium',
  category: DecisionEntry['category'] = 'technical',
): DecisionEntry {
  const store = getMemoryStore();
  return store.addDecision({
    title,
    description,
    category,
    reason,
    impact,
    timestamp: new Date().toISOString(),
    source: projectName,
    metadata: { projectId },
  });
}

export function addProjectNote(projectId: string, note: string): void {
  const store = getMemoryStore();
  store.addProjectNote(projectId, note);
  store.addTimelineEntry({
    source: 'note',
    title: 'Proje notu eklendi',
    description: note.substring(0, 200),
    timestamp: new Date().toISOString(),
    metadata: { projectId },
  });
}

function extractRelatedIds(entries: TimelineEntry[], key: string): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    const val = entry.metadata?.[key];
    if (typeof val === 'string') ids.add(val);
  }
  return [...ids];
}
