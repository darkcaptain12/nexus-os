import type { Opportunity, TaskSummary } from './types';
import type { TaskRecord, ProjectRecord, ProjectProgress } from '@/lib/repositories';

let _seq = 0;
const nextId = () => `opp-${Date.now()}-${_seq++}`;

export interface OpportunityEngineInput {
  tasks: TaskRecord[];
  projects: { project: ProjectRecord; progress: ProjectProgress }[];
  taskSummary: TaskSummary;
  productivityScore: number;
}

/**
 * Opportunity Engine — finds positive opportunities in current state.
 * Complements the Risk Engine (which only finds threats).
 * Each opportunity has an opportunityScore (0-100).
 */
export function findOpportunities(input: OpportunityEngineInput): Opportunity[] {
  const { tasks, projects, taskSummary, productivityScore } = input;
  const opportunities: Opportunity[] = [];

  // 1. Projects near completion — push to finish
  for (const { project, progress } of projects) {
    if (progress.percent >= 80 && progress.percent < 100 && project.status === 'active') {
      const remaining = 100 - progress.percent;
      opportunities.push({
        id: nextId(),
        title: `"${project.name}" neredeyse tamamlandı`,
        description: `%${progress.percent} ilerleme — sadece %${remaining} kaldı.`,
        opportunityScore: Math.round(70 + progress.percent * 0.3),
        category: 'completion',
        reasoning: `Projeye az miktarda ek odak, %100 tamamlanmayı sağlar ve kaynakları serbest bırakır.`,
        actionUrl: '/projeler',
        estimatedBenefit: 'Proje kapanır, kaynaklar serbest kalır',
      });
    }
  }

  // 2. Quick wins — tasks with no due date and low estimated effort
  const quickWinCandidates = tasks.filter(
    (t) =>
      !t.due_date &&
      t.status === 'todo' &&
      t.priority !== 'critical' &&
      t.priority !== 'high' &&
      t.deleted_at === null,
  );
  if (quickWinCandidates.length >= 3) {
    opportunities.push({
      id: nextId(),
      title: `${quickWinCandidates.length} görev hızlı tamamlanabilir`,
      description: "Deadline'ı olmayan, düşük/orta öncelikli görevler birikmiş.",
      opportunityScore: Math.min(75, 45 + quickWinCandidates.length * 3),
      category: 'quick_win',
      reasoning: 'Bu görevler hızla tamamlanırsa toplam görev yükü azalır ve momentum kazanılır.',
      actionUrl: '/gorevler',
      estimatedBenefit: 'İş listesi kısalır, tamamlanma oranı yükselir',
    });
  }

  // 3. Automation opportunity — many repetitive stale tasks
  const staleTasks = tasks.filter((t) => {
    if (t.status === 'completed' || t.status === 'cancelled' || t.deleted_at !== null) return false;
    const daysSinceUpdate = Math.ceil((Date.now() - new Date(t.updated_at).getTime()) / 86400000);
    return daysSinceUpdate > 14;
  });
  if (staleTasks.length >= 2) {
    opportunities.push({
      id: nextId(),
      title: `${staleTasks.length} görev otomatikleştirilebilir veya silinebilir`,
      description: '14+ gündür güncellenmemiş görevler, otomasyon veya temizleme için aday.',
      opportunityScore: Math.min(70, 40 + staleTasks.length * 5),
      category: 'automation',
      reasoning:
        'Uzun süredir hareketsiz görevler genellikle ya gerekli değil ya da otomatikleştirilebilir.',
      actionUrl: '/gorevler',
      estimatedBenefit: 'Zihinsel yük azalır, iş listesi temizlenir',
    });
  }

  // 4. Delegation — high workload + high priority overload
  const openTasks = taskSummary.pending + taskSummary.inProgress;
  if (openTasks > 15 && taskSummary.highPriority > 5) {
    opportunities.push({
      id: nextId(),
      title: 'İş yükü devredilmeye uygun',
      description: `${openTasks} açık görev, ${taskSummary.highPriority} yüksek öncelikli — bir kısmını devretme fırsatı.`,
      opportunityScore: Math.min(80, 50 + openTasks),
      category: 'delegation',
      reasoning: 'Yüksek yük + yüksek öncelik kombinasyonu devir için ideal koşul oluşturuyor.',
      estimatedBenefit: 'Odak kritik işlere kayar, yanıt süresi düşer',
    });
  }

  // 5. Acceleration — high productivity + free slots
  if (productivityScore >= 75 && taskSummary.inProgress <= 3) {
    opportunities.push({
      id: nextId(),
      title: 'Verimlilik yüksek — hız kazanma fırsatı',
      description: `Verimlilik skoru %${productivityScore}. Az aktif görev var — yeni işler alabilirsiniz.`,
      opportunityScore: Math.round(60 + productivityScore * 0.2),
      category: 'acceleration',
      reasoning: 'Yüksek verimlilik + düşük aktif iş = ek kapasite var demek.',
      estimatedBenefit: 'Backlog azalır, sprint hızlanır',
    });
  }

  return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
}
