import type { SupabaseClient } from '@supabase/supabase-js';
import { MemoryRepository, ConversationRepository } from './memory.repository';
import { TaskRepository, GoalRepository } from './task.repository';
import { DesktopRepository } from './desktop.repository';
import { JournalRepository, DecisionRepository } from './journal.repository';
import { ProjectRepository } from './project.repository';

export type { PaginationParams, PaginatedResult, DateRange, RepositoryResult, ListResult } from './types';

export {
  MemoryRepository,
  ConversationRepository,
  TaskRepository,
  GoalRepository,
  DesktopRepository,
  JournalRepository,
  DecisionRepository,
  ProjectRepository,
};

export function createRepositories(db: SupabaseClient) {
  return {
    memories: new MemoryRepository(db),
    conversations: new ConversationRepository(db),
    tasks: new TaskRepository(db),
    goals: new GoalRepository(db),
    desktop: new DesktopRepository(db),
    journals: new JournalRepository(db),
    decisions: new DecisionRepository(db),
    projects: new ProjectRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
