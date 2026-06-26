export type MemorySource =
  | 'desktop'
  | 'task'
  | 'goal'
  | 'project'
  | 'notification'
  | 'system'
  | 'note'
  | 'calendar'
  | 'ai'
  | 'decision'
  | 'journal';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface TimelineEntry {
  id: string;
  source: MemorySource;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DailyJournal {
  id: string;
  date: string;
  sections: JournalSection[];
  summary: string;
  generatedAt: string;
}

export interface JournalSection {
  timeOfDay: TimeOfDay;
  startHour: number;
  endHour: number;
  entries: TimelineEntry[];
  summary: string;
}

export interface WeeklySummary {
  id: string;
  weekStart: string;
  weekEnd: string;
  topApps: { app: string; minutes: number }[];
  focusTimeMinutes: number;
  completedTasks: number;
  completedGoals: number;
  achievements: string[];
  problems: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface ProjectMemory {
  projectId: string;
  projectName: string;
  history: TimelineEntry[];
  notes: string[];
  decisions: DecisionEntry[];
  relatedGoals: string[];
  relatedTasks: string[];
}

export interface DecisionEntry {
  id: string;
  title: string;
  description: string;
  category: 'architecture' | 'user' | 'ai' | 'business' | 'technical';
  reason: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface ActivitySummary {
  id: string;
  periodStart: string;
  periodEnd: string;
  text: string;
  topApps: string[];
  focusScore: number;
  contextSwitches: number;
  generatedAt: string;
}

export interface MemorySearchQuery {
  keyword?: string;
  source?: MemorySource;
  dateFrom?: string;
  dateTo?: string;
  project?: string;
}

export interface MemorySearchResult {
  entries: TimelineEntry[];
  total: number;
  query: MemorySearchQuery;
}
