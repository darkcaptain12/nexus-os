import type { ScenarioInput, ScenarioResult, TaskSummary } from './types';
import type { ProjectProgress } from '@/lib/repositories';

export interface ScenarioContext {
  taskSummary: TaskSummary;
  productivityScore: number;
  projectProgresses: { name: string; percent: number; progress: ProjectProgress }[];
  riskScore: number;
}

/**
 * Scenario Engine — pure computation, no DB calls.
 * Simulates "what if" scenarios by adjusting the current state model and
 * computing resulting risk, benefit, and confidence scores.
 */
export function simulateScenario(input: ScenarioInput, ctx: ScenarioContext): ScenarioResult {
  const { type, subjectTitle, description } = input;
  const { taskSummary, productivityScore, riskScore } = ctx;

  switch (type) {
    case 'task_postponed':
      return simulateTaskPostponed(subjectTitle ?? description, taskSummary, riskScore);
    case 'project_first':
      return simulateProjectFirst(subjectTitle ?? description, ctx);
    case 'delegate':
      return simulateDelegate(subjectTitle ?? description, taskSummary);
    case 'change_plan':
      return simulateChangePlan(description, taskSummary, productivityScore);
    default:
      return simulateGeneric(description);
  }
}

function simulateTaskPostponed(
  taskTitle: string,
  summary: TaskSummary,
  currentRiskScore: number,
): ScenarioResult {
  const overdueImpact = summary.overdue > 0 ? 15 : 5;
  const riskIncrease = currentRiskScore >= 70 ? 20 : 10;

  const risk = Math.min(100, currentRiskScore + riskIncrease);
  const benefit = Math.max(0, 100 - summary.inProgress * 5);
  const confidence = 72;

  return {
    scenario: `"${taskTitle}" ertelenirse ne olur?`,
    risk,
    benefit,
    confidence,
    explanation: `Bu görev ertelenirse diğer ${summary.inProgress} aktif göreve odaklanılabilir. Ancak ${summary.overdue} zaten gecikmiş görev varken erteleme riski %${risk}'e çıkıyor. ${overdueImpact > 10 ? 'Gecikmiş görevler varken erteleme kritik risk taşıyor.' : 'Kontrollü erteleme kabul edilebilir.'}`,
    keyFactors: [
      `Mevcut risk skoru: ${currentRiskScore}`,
      `Gecikmiş görev sayısı: ${summary.overdue}`,
      `Aktif görev sayısı: ${summary.inProgress}`,
    ],
    recommendedAction:
      risk > 70
        ? 'Erteleme önerilmez — önce mevcut gecikmeler çözülmeli'
        : `Maksimum ${Math.round(benefit / 20)} gün erteleme kabul edilebilir`,
    simulatedAt: new Date().toISOString(),
  };
}

function simulateProjectFirst(projectName: string, ctx: ScenarioContext): ScenarioResult {
  const { taskSummary, productivityScore, projectProgresses } = ctx;
  const project = projectProgresses.find((p) =>
    p.name.toLowerCase().includes(projectName.toLowerCase()),
  );
  const currentProgress = project?.percent ?? 50;
  const benefit = Math.round(50 + currentProgress * 0.4);
  const risk = taskSummary.highPriority > 5 ? 60 : 35;
  const confidence = 68;

  return {
    scenario: `"${projectName}" projesini önce bitirirsem ne olur?`,
    risk,
    benefit,
    confidence,
    explanation: `"${projectName}" şu an %${currentProgress} tamamlanmış. Bu projeye öncelik vermek ${100 - currentProgress}% daha fazla ilerleme sağlar. Risk: diğer ${taskSummary.highPriority} yüksek öncelikli görev beklemede kalır. Verimlilik skoru %${productivityScore} ile ${productivityScore > 70 ? 'bu yükü taşıyacak kapasitesi var' : 'zaten baskı altında'}.`,
    keyFactors: [
      `Proje ilerlemesi: %${currentProgress}`,
      `Bekleyen yüksek öncelikli görevler: ${taskSummary.highPriority}`,
      `Verimlilik skoru: %${productivityScore}`,
    ],
    recommendedAction:
      benefit > 70
        ? 'Projeyi önceliklendirmek yüksek faydayla sonuçlanır — diğer görevlere zaman bloğu koy'
        : 'Karma yaklaşım önerilir — projeye odaklan ama kritik görevleri de takip et',
    simulatedAt: new Date().toISOString(),
  };
}

function simulateDelegate(taskTitle: string, summary: TaskSummary): ScenarioResult {
  const overloadScore = Math.min(100, (summary.pending + summary.inProgress) * 3);
  const benefit = Math.min(95, 40 + overloadScore * 0.5);
  const risk = 25;
  const confidence = 65;

  return {
    scenario: `"${taskTitle}" devredilirse ne olur?`,
    risk,
    benefit,
    confidence,
    explanation: `Devretme şu an ${summary.pending + summary.inProgress} açık görev olan iş yükünü hafifletir. Koordinasyon maliyeti gerektirse de (risk: %${risk}), fayda %${Math.round(benefit)} — özellikle yük %${overloadScore} gibi yüksekse.`,
    keyFactors: [
      `Toplam açık görev: ${summary.pending + summary.inProgress}`,
      `Yüksek öncelikli görev: ${summary.highPriority}`,
      `Aşırı yük skoru: %${overloadScore}`,
    ],
    recommendedAction:
      overloadScore > 60
        ? 'Devretme güçlü öneridir — koordinasyon planı yapılarak uygulayın'
        : 'İş yükü yönetilebilir seviyede — devretme opsiyonel',
    simulatedAt: new Date().toISOString(),
  };
}

function simulateChangePlan(
  description: string,
  summary: TaskSummary,
  productivityScore: number,
): ScenarioResult {
  const risk = productivityScore < 50 ? 55 : 30;
  const benefit = productivityScore > 70 ? 75 : 55;
  const confidence = 60;

  return {
    scenario: `Haftalık planı değiştirirsem ne olur? (${description})`,
    risk,
    benefit,
    confidence,
    explanation: `Mevcut verimlilik skoru %${productivityScore} ile ${productivityScore > 70 ? 'güçlü bir konumdasınız — plan değişikliği fırsatı yaratabilir' : 'baskı altındasınız — plan değişikliği riski artırabilir'}. ${summary.overdue > 0 ? `${summary.overdue} gecikmiş görev plan değişikliğini riskli kılıyor.` : 'Gecikme yok — değişiklik için uygun zaman.'}`,
    keyFactors: [
      `Verimlilik skoru: %${productivityScore}`,
      `Gecikmiş görevler: ${summary.overdue}`,
      `Yüksek öncelikli görev: ${summary.highPriority}`,
    ],
    recommendedAction:
      risk > 50
        ? 'Plan değişikliğini küçük adımlarla uygulayın — önce gecikmeleri temizleyin'
        : 'Plan değişikliği için uygun koşullar — uygulayabilirsiniz',
    simulatedAt: new Date().toISOString(),
  };
}

function simulateGeneric(description: string): ScenarioResult {
  return {
    scenario: description,
    risk: 50,
    benefit: 50,
    confidence: 45,
    explanation:
      "Yeterli veri olmadan kesin senaryo analizi yapılamıyor. Lütfen görev veya proje ID'si belirtin.",
    keyFactors: ['Yetersiz bağlam'],
    recommendedAction: 'Daha spesifik bir senaryo tanımlayın',
    simulatedAt: new Date().toISOString(),
  };
}
