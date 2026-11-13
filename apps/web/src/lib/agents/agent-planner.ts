import type { AgentPlan, AgentStep } from './types';

type StepTemplate = Omit<AgentStep, 'id'>;

interface PlannerRule {
  pattern: RegExp;
  buildSteps: () => StepTemplate[];
}

const RULES: PlannerRule[] = [
  {
    // Commerce Agent akışı: Hunter→Executive→Approval→Publish→Ads→Optimize
    // Publish + Ads adımları requiresApproval:true — gerçek para/yayın onaysız çalışmaz.
    pattern:
      /ürün bul|para kazan|en çok kazandır|product hunt|dropship|mağaza.*ürün|satılabilecek ürün|commerce/i,
    buildSteps: () => [
      {
        name: 'Ürün Analizi & Kayıt',
        description: 'Product Hunter sonucunu hafızaya kaydeder (keşif+skor, para harcama yok)',
        actionId: 'memory.save',
        params: { content: 'Commerce Agent: ürün avı tamamlandı', type: 'knowledge' },
        requiresApproval: false,
        status: 'pending',
      },
      {
        name: 'Ürün Yayınla',
        description: 'En yüksek skorlu ürünü mağazaya yayınlar — kullanıcı onayı ZORUNLU',
        actionId: 'commerce.publishProduct',
        params: { queueId: 'TOP_SCORED' },
        requiresApproval: true,
        approvalReason:
          'Ürün yayınlama gerçek mağaza değişikliğidir — Approval Queue onayı gerekli.',
        status: 'pending',
      },
      {
        name: 'Reklam Başlat',
        description: 'Yayınlanan ürün için reklam kampanyası — gerçek para, onay ZORUNLU',
        actionId: 'commerce.launchAd',
        params: { queueId: 'TOP_SCORED', platform: 'meta' },
        requiresApproval: true,
        approvalReason: 'Reklam başlatma gerçek para harcar — Approval Queue son kontrol.',
        status: 'pending',
      },
      {
        name: 'Sonucu Kaydet',
        description: 'Commerce döngüsü sonucunu kaydeder',
        actionId: 'memory.save',
        params: { content: 'Commerce Agent döngüsü tamamlandı', type: 'knowledge' },
        requiresApproval: false,
        status: 'pending',
      },
    ],
  },
  {
    // Trading Agent akışı: Market→Analiz→Risk→Executive→Approval→Order→Takip→Sonuç
    // Order adımı requiresApproval:true — hiçbir emir kullanıcı onayı olmadan basılmaz.
    pattern: /trading|trade|al.?sat|pozisyon aç|işlem yap|long|short/i,
    buildSteps: () => [
      {
        name: 'Piyasa Analizi',
        description: 'Sembol için teknik indikatörler + SMC analizi üretir',
        actionId: 'trade.analyze',
        params: { symbol: 'BTCUSDT', exchange: 'okx', timeframe: '1h' },
        requiresApproval: false,
        status: 'pending',
      },
      {
        name: 'Risk Kontrolü',
        description: 'Planlanan emri risk profiline karşı doğrular',
        actionId: 'trade.riskCheck',
        params: { symbol: 'BTCUSDT', exchange: 'okx', quantity: 0.001 },
        requiresApproval: false,
        status: 'pending',
      },
      {
        name: 'Paper Emir',
        description: 'Paper trading hesabına emir basar — kullanıcı onayı ZORUNLU',
        actionId: 'trade.paperOrder',
        params: { symbol: 'BTCUSDT', exchange: 'okx', side: 'buy', quantity: 0.001 },
        requiresApproval: true,
        approvalReason: 'Trading emirleri Approval Queue onayı olmadan gönderilmez.',
        status: 'pending',
      },
      {
        name: 'Sonucu Kaydet',
        description: 'İşlem sonucunu hafızaya kaydeder',
        actionId: 'memory.save',
        params: { content: 'Trading agent döngüsü tamamlandı', type: 'knowledge' },
        requiresApproval: false,
        status: 'pending',
      },
    ],
  },
  {
    pattern: /görev oluştur|create task|yeni görev|task.*oluştur/i,
    buildSteps: () => [
      {
        name: 'Görev Oluştur',
        description: 'Yeni görev oluşturur',
        actionId: 'task.create',
        params: { title: 'Agent tarafından oluşturulan görev', priority: 'normal' },
        requiresApproval: false,
        status: 'pending',
      },
      {
        name: 'Hafızaya Kaydet',
        description: 'Oluşturulan görevi hafızaya kaydeder',
        actionId: 'memory.save',
        params: { content: 'Yeni görev başarıyla oluşturuldu', type: 'knowledge' },
        requiresApproval: false,
        status: 'pending',
      },
    ],
  },
  {
    pattern: /görev tamamla|complete task|kapat|close task/i,
    buildSteps: () => [
      {
        name: 'Görev Tamamla',
        description: 'Görevi tamamlandı olarak işaretler — onay gerekli',
        actionId: 'task.complete',
        params: {},
        requiresApproval: true,
        approvalReason: 'Görev tamamlama durumu değiştirmeye onay gereklidir.',
        status: 'pending',
      },
      {
        name: 'Hafızaya Kaydet',
        description: 'Tamamlama sonucunu kaydeder',
        actionId: 'memory.save',
        params: { content: 'Görev tamamlandı', type: 'knowledge' },
        requiresApproval: false,
        status: 'pending',
      },
    ],
  },
  {
    pattern: /görev sil|delete task|görevi kaldır/i,
    buildSteps: () => [
      {
        name: 'Görev Sil',
        description: 'Görevi kalıcı olarak siler — kullanıcı onayı ZORUNLU',
        actionId: 'task.delete',
        params: {},
        requiresApproval: true,
        approvalReason: 'Görev silme işlemi geri alınamaz.',
        status: 'pending',
      },
    ],
  },
  {
    pattern: /proje arşivle|archive project|projeyi kapat/i,
    buildSteps: () => [
      {
        name: 'Proje Arşivle',
        description: 'Projeyi arşivler — kritik işlem, kullanıcı onayı ZORUNLU',
        actionId: 'project.archive',
        params: {},
        requiresApproval: true,
        approvalReason: 'Proje arşivleme kritik bir değişikliktir.',
        status: 'pending',
      },
    ],
  },
  {
    pattern: /bildirim gönder|send notification|notify|rapor gönder/i,
    buildSteps: () => [
      {
        name: 'Bildirim Gönder',
        description: 'Kullanıcıya bildirim gönderir',
        actionId: 'notification.send',
        params: { title: 'AI Agent Bildirimi', body: 'Agent görevi tamamlandı.' },
        requiresApproval: false,
        status: 'pending',
      },
    ],
  },
  {
    pattern: /hafıza.*kaydet|memory.*save|hatıra.*kaydet|save.*memory/i,
    buildSteps: () => [
      {
        name: 'Hafızaya Kaydet',
        description: 'İçeriği memory sistemine kaydeder',
        actionId: 'memory.save',
        params: { content: 'Agent hafıza kaydı', type: 'knowledge' },
        requiresApproval: false,
        status: 'pending',
      },
    ],
  },
  {
    pattern: /öncelik.*değiştir|priority.*change|update.*priority/i,
    buildSteps: () => [
      {
        name: 'Öncelik Değiştir',
        description: 'Görev önceliğini günceller',
        actionId: 'task.updatePriority',
        params: { priority: 'high' },
        requiresApproval: false,
        status: 'pending',
      },
      {
        name: 'Hafızaya Kaydet',
        description: 'Öncelik değişikliğini kaydeder',
        actionId: 'memory.save',
        params: { content: 'Görev önceliği güncellendi', type: 'knowledge' },
        requiresApproval: false,
        status: 'pending',
      },
    ],
  },
];

function defaultSteps(goal: string): StepTemplate[] {
  return [
    {
      name: 'Bağlamı Analiz Et',
      description: 'Hedefi analiz eder ve bağlamı değerlendirir',
      params: { goal },
      requiresApproval: false,
      status: 'pending',
    },
    {
      name: 'Sonucu Kaydet',
      description: 'Analiz sonucunu hafızaya kaydeder',
      actionId: 'memory.save',
      params: { content: `Agent analizi tamamlandı: ${goal}`, type: 'knowledge' },
      requiresApproval: false,
      status: 'pending',
    },
    {
      name: 'Kullanıcıya Bildir',
      description: 'Tamamlanan işlemi kullanıcıya bildirir',
      actionId: 'notification.send',
      params: { title: 'AI Agent', body: `Görev tamamlandı: ${goal.slice(0, 80)}` },
      requiresApproval: false,
      status: 'pending',
    },
  ];
}

export function planAgent(goal: string): AgentPlan {
  let templates: StepTemplate[] = [];

  for (const rule of RULES) {
    if (rule.pattern.test(goal)) {
      templates = rule.buildSteps();
      break;
    }
  }

  if (templates.length === 0) {
    templates = defaultSteps(goal);
  }

  const steps: AgentStep[] = templates.map((t) => ({
    ...t,
    id: crypto.randomUUID(),
  }));

  return {
    goal,
    steps,
    currentStepIndex: 0,
    generatedAt: new Date().toISOString(),
    totalSteps: steps.length,
  };
}

export function getCurrentStep(plan: AgentPlan): AgentStep | null {
  if (plan.currentStepIndex >= plan.steps.length) return null;
  return plan.steps[plan.currentStepIndex] ?? null;
}

export function isLastStep(plan: AgentPlan): boolean {
  return plan.currentStepIndex >= plan.steps.length - 1;
}

export function advanceStep(plan: AgentPlan): void {
  plan.currentStepIndex += 1;
}
