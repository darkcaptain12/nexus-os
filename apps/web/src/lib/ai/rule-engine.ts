import type {
  TaskSummary,
  GoalSummary,
  CalendarSummary,
  ReminderSummary,
  SystemState,
  Recommendation,
  ModuleStatus,
} from './types';

let ruleExecutionCount = 0;

export function generateRecommendations(context: {
  tasks: TaskSummary;
  goals: GoalSummary;
  calendar: CalendarSummary;
  reminders: ReminderSummary;
  system: SystemState;
  modules: ModuleStatus[];
}): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const { tasks, goals, calendar, reminders, system, modules } = context;
  ruleExecutionCount++;

  if (tasks.overdue > 0) {
    recommendations.push({
      id: 'overdue-tasks',
      title: `${tasks.overdue} gecikmiş görev var`,
      description: 'Gecikmiş görevleri tamamlayın veya tarihlerini güncelleyin.',
      category: 'task',
      priority: 1,
      score: 95,
      actionUrl: '/gorevler',
      reasoning: `${tasks.overdue} görev son teslim tarihini geçmiş.`,
    });
  }

  if (tasks.dueToday > 0) {
    recommendations.push({
      id: 'due-today',
      title: `Bugün ${tasks.dueToday} görev teslim edilmeli`,
      description: 'Bugünkü görevlere öncelik verin.',
      category: 'task',
      priority: 2,
      score: 90,
      actionUrl: '/gorevler',
      reasoning: `${tasks.dueToday} görevin son teslim tarihi bugün.`,
    });
  }

  if (tasks.highPriority > 0) {
    recommendations.push({
      id: 'high-priority',
      title: `${tasks.highPriority} yüksek öncelikli görev`,
      description: 'Yüksek öncelikli görevleri ilk sıraya alın.',
      category: 'task',
      priority: 3,
      score: 85,
      actionUrl: '/gorevler',
      reasoning: 'Yüksek öncelikli görevler bekliyor.',
    });
  }

  if (tasks.total === 0) {
    recommendations.push({
      id: 'no-tasks',
      title: 'İlk görevinizi oluşturun',
      description: 'Görevler sayfasından yeni bir görev ekleyerek başlayın.',
      category: 'productivity',
      priority: 5,
      score: 60,
      actionUrl: '/gorevler',
      reasoning: 'Henüz görev tanımlanmamış.',
    });
  }

  if (goals.active > 0 && goals.averageProgress < 30) {
    recommendations.push({
      id: 'low-goal-progress',
      title: 'Hedef ilerlemesi düşük',
      description: `Aktif hedeflerinizin ortalama ilerlemesi %${Math.round(goals.averageProgress)}.`,
      category: 'goal',
      priority: 4,
      score: 75,
      actionUrl: '/projeler',
      reasoning: 'Hedefler yeterli ilerleme göstermiyor.',
    });
  }

  if (goals.total === 0) {
    recommendations.push({
      id: 'no-goals',
      title: 'Bir hedef belirleyin',
      description: 'Hedefler, önceliklerinizi belirlemize yardımcı olur.',
      category: 'goal',
      priority: 6,
      score: 55,
      actionUrl: '/projeler',
      reasoning: 'Henüz hedef tanımlanmamış.',
    });
  }

  if (calendar.nextEvent) {
    recommendations.push({
      id: 'next-event',
      title: `Yaklaşan etkinlik: ${calendar.nextEvent.title}`,
      description: `Bugün ${new Date(calendar.nextEvent.startAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} saatinde.`,
      category: 'productivity',
      priority: 2,
      score: 88,
      actionUrl: '/takvim',
      reasoning: 'Bugün takvimde etkinlik var.',
    });
  }

  if (reminders.overdueCount > 0) {
    recommendations.push({
      id: 'overdue-reminders',
      title: `${reminders.overdueCount} kaçırılmış hatırlatma`,
      description: 'Kaçırılmış hatırlatmalarınızı kontrol edin.',
      category: 'productivity',
      priority: 2,
      score: 80,
      actionUrl: '/takvim',
      reasoning: 'Hatırlatmalar zamanında görülmemiş.',
    });
  }

  if (system.healthScore < 80) {
    recommendations.push({
      id: 'system-health',
      title: 'Sistem sağlığı düşük',
      description: `Sistem sağlık puanı: ${system.healthScore}. Servisleri kontrol edin.`,
      category: 'system',
      priority: 1,
      score: 92,
      reasoning: `Sağlık puanı ${system.healthScore} — eşik altında.`,
    });
  }

  if (system.servicesFailed > 0) {
    recommendations.push({
      id: 'failed-services',
      title: `${system.servicesFailed} servis başarısız`,
      description: 'Başarısız servisleri yeniden başlatın.',
      category: 'system',
      priority: 1,
      score: 98,
      reasoning: 'Kritik servisler çalışmıyor.',
    });
  }

  const unconfiguredModules = modules.filter((m) => m.status === 'unconfigured');
  if (unconfiguredModules.length > 0 && unconfiguredModules.length <= 3) {
    recommendations.push({
      id: 'configure-modules',
      title: `${unconfiguredModules.length} modül yapılandırılmamış`,
      description: `${unconfiguredModules.map((m) => m.name).join(', ')} modüllerini etkinleştirin.`,
      category: 'system',
      priority: 7,
      score: 40,
      actionUrl: '/ayarlar',
      reasoning: 'Bazı modüller henüz yapılandırılmamış.',
    });
  }

  return recommendations.sort((a, b) => b.score - a.score);
}

export function generateBriefingSummary(context: {
  userName: string;
  tasks: TaskSummary;
  goals: GoalSummary;
  calendar: CalendarSummary;
  reminders: ReminderSummary;
  system: SystemState;
  notifications: { unread: number };
}): string[] {
  const { userName, tasks, goals, calendar, reminders, system, notifications } = context;
  const lines: string[] = [];
  const hour = new Date().getHours();

  const greeting = hour < 6 ? 'İyi geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  lines.push(`${greeting}, ${userName}.`);

  if (tasks.dueToday > 0) {
    lines.push(`Bugün tamamlanması gereken ${tasks.dueToday} görev var.`);
  } else if (tasks.pending > 0) {
    lines.push(`${tasks.pending} bekleyen görev var.`);
  } else {
    lines.push('Bekleyen görev bulunmuyor.');
  }

  if (tasks.overdue > 0) {
    lines.push(`⚠️ ${tasks.overdue} görev gecikmiş durumda.`);
  }

  if (calendar.eventsToday > 0) {
    lines.push(`Takviminde bugün ${calendar.eventsToday} etkinlik bulunuyor.`);
  }

  if (reminders.upcoming > 0) {
    lines.push(`${reminders.upcoming} yaklaşan hatırlatma var.`);
  }

  if (goals.active > 0) {
    lines.push(`${goals.active} aktif hedefin ortalama ilerlemesi %${Math.round(goals.averageProgress)}.`);
  }

  if (notifications.unread > 0) {
    lines.push(`${notifications.unread} okunmamış bildirim var.`);
  }

  lines.push(`Sistem sağlığı %${system.healthScore}.`);

  if (!system.aiProviderConfigured) {
    lines.push('AI sağlayıcı henüz yapılandırılmamış — kural motoru aktif.');
  }

  return lines;
}

export function getRuleExecutionCount(): number {
  return ruleExecutionCount;
}
