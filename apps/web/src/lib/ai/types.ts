export interface UserState {
  userId: string;
  name: string;
  email: string;
  timezone: string;
  locale: string;
}

export interface SystemState {
  kernelPhase: string;
  healthScore: number;
  servicesTotal: number;
  servicesRunning: number;
  servicesFailed: number;
  eventsPublished: number;
  commandsDispatched: number;
  uptime: number;
  aiProviderConfigured: boolean;
  memoryEngineActive: boolean;
  agentSystemActive: boolean;
}

export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueToday: number;
  highPriority: number;
}

export interface GoalSummary {
  total: number;
  active: number;
  completed: number;
  averageProgress: number;
}

export interface CalendarSummary {
  eventsToday: number;
  eventsThisWeek: number;
  nextEvent?: { title: string; startAt: string };
}

export interface ReminderSummary {
  upcoming: number;
  overdueCount: number;
  nextReminder?: { title: string; remindAt: string };
}

export interface NotificationSummary {
  unread: number;
  total: number;
}

export interface ModuleStatus {
  name: string;
  enabled: boolean;
  status: 'active' | 'configured' | 'unconfigured' | 'disabled';
}

export interface DailyBriefing {
  greeting: string;
  date: string;
  summary: string[];
  taskSummary: TaskSummary;
  goalSummary: GoalSummary;
  calendarSummary: CalendarSummary;
  reminderSummary: ReminderSummary;
  systemHealth: SystemState;
  modules: ModuleStatus[];
  generatedAt: string;
  generatedBy: 'rule-engine' | 'ai-provider';
  durationMs: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'task' | 'goal' | 'health' | 'productivity' | 'system' | 'learning';
  priority: number;
  score: number;
  actionUrl?: string;
  reasoning: string;
}

export interface AIExecutiveStatus {
  mode: 'rule-engine' | 'ai-provider';
  provider?: string;
  model?: string;
  kernelPhase: string;
  healthScore: number;
  memoryActive: boolean;
  agentsActive: boolean;
  lastExecutionAt?: string;
  lastExecutionDurationMs?: number;
  totalExecutions: number;
  fallbackMode: boolean;
}
