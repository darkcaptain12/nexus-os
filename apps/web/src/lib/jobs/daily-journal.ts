import type { SupabaseClient } from '@supabase/supabase-js';
import { createRepositories } from '@/lib/repositories';

export async function generateAndSaveDailyJournal(
  db: SupabaseClient,
  userId: string,
  date?: string,
): Promise<{ saved: boolean; error?: string }> {
  const repos = createRepositories(db);
  const targetDate = date ?? new Date().toISOString().split('T')[0]!;

  const existing = await repos.journals.findJournalByDate(targetDate, userId);
  if (existing.data) {
    return { saved: false, error: 'Journal already exists for this date' };
  }

  const taskSummary = await repos.tasks.getSummary();
  const goalSummary = await repos.goals.getSummary();
  const desktopCount = await repos.desktop.getActivityCount(targetDate);
  const topApps = await repos.desktop.getTopApps(targetDate, 5);

  const lines: string[] = [
    `# Günlük — ${formatDateTR(targetDate)}`,
    '',
    '## Özet',
    '',
  ];

  if (taskSummary.completed > 0) {
    lines.push(`- ${taskSummary.completed} görev tamamlandı`);
  }
  if (taskSummary.pending > 0) {
    lines.push(`- ${taskSummary.pending} görev bekliyor`);
  }
  if (taskSummary.overdue > 0) {
    lines.push(`- ⚠️ ${taskSummary.overdue} görev gecikmiş`);
  }
  if (goalSummary.active > 0) {
    lines.push(`- ${goalSummary.active} aktif hedef (%${Math.round(goalSummary.averageProgress)} ilerleme)`);
  }

  if (desktopCount > 0) {
    lines.push('');
    lines.push('## Masaüstü Aktivitesi');
    lines.push('');
    lines.push(`- ${desktopCount} aktivite kaydı`);
    if (topApps.length > 0) {
      lines.push(`- En çok kullanılan: ${topApps.map((a) => a.app).join(', ')}`);
    }
  }

  const content = lines.join('\n');
  const result = await repos.journals.saveJournal(targetDate, userId, content);

  if (result.error) {
    return { saved: false, error: result.error };
  }

  return { saved: true };
}

export async function cleanupExpiredMemories(db: SupabaseClient): Promise<number> {
  const repos = createRepositories(db);
  return repos.memories.cleanupExpired();
}

function formatDateTR(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
