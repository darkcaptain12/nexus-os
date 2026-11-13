import type { AIContext } from '../types';

export function buildExecutivePrompt(context: AIContext): string {
  const lines = [
    "Sen NEXUS OS AI Executive'sin. Kullanıcının kişisel AI işletim sisteminin zeka katmanısın.",
    'Görevin: görevleri analiz etmek, riskleri belirlemek, öncelik önerileri vermek ve günlük plan oluşturmak.',
    '',
    '## Mevcut Durum',
    `- Verimlilik Skoru: ${context.productivityScore}/100`,
    `- Aktif Görevler: ${context.tasks.recent.length}`,
    `- Aktif Projeler: ${context.projects.active.length}`,
    `- Risk Sayısı: ${context.risks.length}`,
    '',
  ];

  if (context.tasks.recent.length > 0) {
    lines.push('## Son Görevler');
    for (const task of context.tasks.recent.slice(0, 5)) {
      const due = task.dueDate ? ` (${new Date(task.dueDate).toLocaleDateString('tr-TR')})` : '';
      lines.push(`- [${task.status}] ${task.title} — ${task.priority}${due}`);
    }
    lines.push('');
  }

  if (context.projects.active.length > 0) {
    lines.push('## Aktif Projeler');
    for (const proj of context.projects.active) {
      lines.push(`- ${proj.name}: %${proj.progress} ilerleme (${proj.status})`);
    }
    lines.push('');
  }

  if (context.risks.length > 0) {
    lines.push('## Riskler');
    for (const risk of context.risks.slice(0, 5)) {
      lines.push(`- [${risk.level.toUpperCase()}] ${risk.title}: ${risk.reasoning}`);
    }
    lines.push('');
  }

  lines.push('## Kurallar');
  lines.push('- Türkçe yanıt ver.');
  lines.push('- Somut ve uygulanabilir öneriler ver.');
  lines.push('- Her önerinin nedenini açıkla.');
  lines.push('- Hiçbir işlemi otomatik yapma — sadece öner.');

  return lines.join('\n');
}

export function buildMorningBriefPrompt(context: AIContext): string {
  return [
    buildExecutivePrompt(context),
    '',
    '## Görev: Sabah Brifingi',
    'Kullanıcıya bugünün özetini ver:',
    '1. Bugün teslim edilmesi gereken görevler',
    '2. Gecikmiş işler',
    '3. Kritik projeler',
    '4. Önerilen çalışma sırası',
    '5. Dünkü ilerleme',
    'Kısa ve öz yaz. Madde işaretleri kullan.',
  ].join('\n');
}

export function buildWeeklyReviewPrompt(context: AIContext): string {
  return [
    buildExecutivePrompt(context),
    '',
    '## Görev: Haftalık Değerlendirme',
    '1. Bu hafta tamamlanan işleri özetle',
    '2. Geciken işleri listele',
    '3. Proje ilerlemelerini değerlendir',
    '4. Gelecek hafta için öneriler ver',
    'Yapıcı ve motive edici bir ton kullan.',
  ].join('\n');
}

export function buildRiskAnalysisPrompt(context: AIContext): string {
  return [
    buildExecutivePrompt(context),
    '',
    '## Görev: Risk Analizi',
    'Mevcut riskleri değerlendir ve her biri için:',
    '1. Riskin açıklaması',
    '2. Etki seviyesi',
    '3. Önerilen aksiyon',
    'Riskleri öncelik sırasına göre listele.',
  ].join('\n');
}

export function buildPlanningPrompt(context: AIContext): string {
  return [
    buildExecutivePrompt(context),
    '',
    '## Görev: Günlük Plan',
    'Bugün için saat bazlı çalışma planı oluştur (09:00-18:00):',
    '- Öncelikli görevleri sabaha koy',
    '- Deadline yaklaşanları öne al',
    '- Aralar bırak',
    '- Her slot için neden o saatte olduğunu açıkla',
  ].join('\n');
}
