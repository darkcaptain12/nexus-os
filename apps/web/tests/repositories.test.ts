import { describe, it, expect } from 'vitest';
import { createRepositories } from '../src/lib/repositories';

describe('Repository Factory', () => {
  it('creates all repositories from a supabase client', () => {
    const mockDb = {} as Parameters<typeof createRepositories>[0];
    const repos = createRepositories(mockDb);

    expect(repos.memories).toBeDefined();
    expect(repos.conversations).toBeDefined();
    expect(repos.tasks).toBeDefined();
    expect(repos.goals).toBeDefined();
    expect(repos.desktop).toBeDefined();
    expect(repos.journals).toBeDefined();
    expect(repos.decisions).toBeDefined();
    expect(repos.projects).toBeDefined();
  });

  it('all repositories have distinct instances', () => {
    const mockDb = {} as Parameters<typeof createRepositories>[0];
    const repos = createRepositories(mockDb);
    const values = Object.values(repos);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
