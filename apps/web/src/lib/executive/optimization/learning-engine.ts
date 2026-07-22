import type { Lesson, LearningReport, FailureItem } from './types';
import { getMemoryStore } from '@/lib/memory/store';
import { recordLearning } from '@/lib/knowledge/auto-linker';
import { deferPersist } from '@/lib/persist-after';
import { persistLesson } from '@/lib/persist-stores';

// Learning Engine — her başarısızlık için neden/tekrar-riski/önlem öğrenir.
// Memory (source: decision) + Knowledge Graph'a yazar → Executive Context bunu
// okur (Context Builder mevcut, yeniden yazılmaz). Ring buffer.

const g = globalThis as unknown as { __apexLessons?: Lesson[] };
const MAX_LESSONS = 300;

function store(): Lesson[] {
  if (!g.__apexLessons) g.__apexLessons = [];
  return g.__apexLessons;
}

// Domain'e göre neden/önlem üretimi — gerçek başarısızlık verisinden türetilir.
function analyzeCause(f: FailureItem): {
  cause: string;
  risk: Lesson['recurrenceRisk'];
  prevention: string;
} {
  switch (f.domain) {
    case 'trade':
      return {
        cause: `Zarar eden işlem: ${f.detail}`,
        risk:
          f.detail.includes('risk skoru') && /risk skoru (7[0-9]|[89][0-9]|100)/.test(f.detail)
            ? 'high'
            : 'medium',
        prevention:
          'Risk skoru yüksek işlemlerde pozisyon boyutunu düşür; stop-loss disiplinini sıkılaştır.',
      };
    case 'ad':
      return {
        cause: `ROAS eşiğin altında: ${f.detail}`,
        risk: 'high',
        prevention:
          'ROAS < 1 kampanyalarda bütçeyi durdur; kreatif/hedef kitle A/B testine al (Approval üzerinden).',
      };
    case 'workflow':
      return {
        cause: `Workflow yürütme hatası: ${f.detail}`,
        risk: 'medium',
        prevention: 'Başarısız adıma retry/backoff ekle; giriş doğrulamasını node başında yap.',
      };
    case 'agent':
      return {
        cause: `Agent görevini tamamlayamadı: ${f.detail}`,
        risk: 'medium',
        prevention:
          "Agent adımlarını küçült; approval bekleme timeout'unu düşür; hata durumunda fallback plan tanımla.",
      };
    default:
      return {
        cause: `Yanlış karar: ${f.detail}`,
        risk: 'low',
        prevention:
          "Karar öncesi confidence eşiğini yükselt; benzer geçmiş kararların sonucunu context'e ekle.",
      };
  }
}

/**
 * Başarısızlıklardan ders çıkar — deduplicate (aynı ref bir kez öğrenilir),
 * Memory + Knowledge Graph'a yazar. Executive Context bu dersleri okur.
 */
export function learnFromFailures(failures: FailureItem[]): Lesson[] {
  const s = store();
  const existingRefs = new Set(s.map((l) => `${l.domain}:${l.ref}`));
  const newLessons: Lesson[] = [];

  for (const f of failures) {
    const key = `${f.domain}:${f.ref}`;
    if (existingRefs.has(key)) continue;
    existingRefs.add(key);

    const { cause, risk, prevention } = analyzeCause(f);
    const lesson: Lesson = {
      id: crypto.randomUUID(),
      domain: f.domain,
      ref: f.ref,
      cause,
      recurrenceRisk: risk,
      prevention,
      createdAt: new Date().toISOString(),
    };
    s.push(lesson);
    newLessons.push(lesson);

    // Memory'ye karar olarak yaz (Executive Context reuse eder)
    getMemoryStore().addDecision({
      title: `Öğrenilen ders: ${f.title}`,
      description: `${cause} → Önlem: ${prevention}`,
      category: 'ai',
      reason: `Tekrar riski: ${risk}`,
      impact: risk === 'high' ? 'high' : 'medium',
      timestamp: lesson.createdAt,
      source: 'self-optimization',
      metadata: { domain: f.domain, ref: f.ref, recurrenceRisk: risk },
    });

    // Knowledge Graph: Ders → Domain → Önlem zinciri
    recordLearning({ domain: f.domain, title: f.title, cause, prevention, risk });

    // Supabase write-through (öğrenilen ders kalıcı)
    deferPersist(() => persistLesson(lesson));
  }

  if (s.length > MAX_LESSONS) s.splice(0, s.length - MAX_LESSONS);
  return newLessons;
}

export function getLearningReport(): LearningReport {
  const s = store();
  const byDomain: Record<string, number> = {};
  for (const l of s) byDomain[l.domain] = (byDomain[l.domain] ?? 0) + 1;

  const highRiskCount = s.filter((l) => l.recurrenceRisk === 'high').length;
  const topDomain = Object.entries(byDomain).sort((a, b) => b[1] - a[1])[0];

  const topInsight =
    s.length === 0
      ? 'Henüz ders çıkarılmadı — başarısızlık verisi biriktikçe öğrenme başlar.'
      : highRiskCount > 0
        ? `${highRiskCount} yüksek riskli tekrar tespit edildi — en çok ${topDomain?.[0]} alanında (${topDomain?.[1]} ders).`
        : `${s.length} ders çıkarıldı; en yoğun alan ${topDomain?.[0]} (${topDomain?.[1]}).`;

  return {
    lessons: [...s].reverse().slice(0, 50),
    totalLessons: s.length,
    highRiskCount,
    byDomain,
    topInsight,
    generatedAt: new Date().toISOString(),
  };
}

export function getLessons(domain?: Lesson['domain'], limit = 50): Lesson[] {
  let items = [...store()].reverse();
  if (domain) items = items.filter((l) => l.domain === domain);
  return items.slice(0, limit);
}
