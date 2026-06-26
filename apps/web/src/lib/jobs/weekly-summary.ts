import type { SupabaseClient } from '@supabase/supabase-js';
import { createRepositories } from '@/lib/repositories';

export async function generateWeeklySummary(
  db: SupabaseClient,
  userId: string,
): Promise<string> {
  const repos = createRepositories(db);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0]!;

  const taskSummary = await repos.tasks.getSummary();
  const goalSummary = await repos.goals.getSummary();
  const topApps = await repos.desktop.getTopApps(weekStartStr, 5);

  const lines: string[] = [
    `# Haftalık Özet — ${formatDateTR(weekStartStr)}`,
    '',
  ];

  lines.push('## Görevler');
  lines.push(`- Tamamlanan: ${taskSummary.completed}`);
  lines.push(`- Bekleyen: ${taskSummary.pending}`);
  lines.push(`- Gecikmiş: ${taskSummary.overdue}`);
  lines.push('');

  lines.push('## Hedefler');
  lines.push(`- Aktif: ${goalSummary.active}`);
  lines.push(`- Ortalama ilerleme: %${Math.round(goalSummary.averageProgress)}`);
  lines.push('');

  if (topApps.length > 0) {
    lines.push('## En Çok Kullanılan Uygulamalar');
    for (const app of topApps) {
      lines.push(`- ${app.app}: ${Math.round(app.seconds / 60)} dakika`);
    }
    lines.push('');
  }

  const content = lines.join('\n');

  await repos.journals.saveJournal(`week-${weekStartStr}`, userId, content);

  return content;
}

function formatDateTR(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}
