import type { SupabaseClient } from '@supabase/supabase-js';
import { MemoryRepository, ConversationRepository } from './memory.repository';
import { TaskRepository, GoalRepository } from './task.repository';
import { DesktopRepository } from './desktop.repository';
import { JournalRepository, DecisionRepository } from './journal.repository';
import { ProjectRepository } from './project.repository';
import { UserRepository } from './user.repository';

export type {
  PaginationParams,
  PaginatedResult,
  DateRange,
  RepositoryResult,
  ListResult,
} from './types';
export type {
  UserRecord,
  UserProfileRecord,
  UserPreferencesRecord,
  FullUserProfile,
} from './user.repository';
export type {
  TaskRecord,
  TaskFilters,
  TaskCommentRecord,
  TaskActivityRecord,
} from './task.repository';
export type {
  ProjectRecord,
  ProjectFilters,
  ProjectProgress,
  ProjectActivityRecord,
} from './project.repository';
export type {
  MemoryRecord,
  MemoryLinkRecord,
  MemoryEntityRecord,
  MemoryHealthReport,
  MemoryGraphNode,
  MemoryGraphEdge,
} from './memory.repository';

export {
  MemoryRepository,
  ConversationRepository,
  TaskRepository,
  GoalRepository,
  DesktopRepository,
  JournalRepository,
  DecisionRepository,
  ProjectRepository,
  UserRepository,
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
    users: new UserRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
