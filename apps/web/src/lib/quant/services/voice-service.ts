import type { VoiceIntent, VoiceIntentName, VoiceResponse } from '../types';
import { getTradingStatusSummary } from './quant-service';
import { getMemoryStore } from '@/lib/memory/store';
import { createAgent } from '@/lib/agents/agent-runtime';
import { searchKnowledge } from '@/lib/knowledge/semantic-search';
import {
  describeScreen,
  explainScreenError,
  getRecentFileInsightsForVoice,
} from '@/lib/desktop-vision/services/voice-bridge';
import { getClipboardHistory } from '@/lib/desktop-vision/clipboard-service';
import { liveTradingSummary } from '@/lib/quant/live/services/live-trading-service';
import { getRiskProfileV2 } from '@/lib/quant/live/risk-engine-v2';
import { getMarketSnapshot } from './quant-service';

/**
 * APEX Voice servis altyapısı (Sprint 14 hazırlık).
 *
 * Bu katman ses motoru DEĞİLDİR: "Hey APEX" wake-word, STT/TTS ileride mobil
 * istemcide çalışacak. Buradaki sözleşme: istemci metni gönderir →
 * parseVoiceIntent kural tabanlı intent çıkarır → handleVoiceIntent mevcut
 * Agent Runtime / Executive / Quant servislerini çağırır → konuşulabilir
 * `speech` + yapılandırılmış `data` döner. Apple Watch / Wear OS aynı ucu kullanır.
 *
 * Onay mimarisi korunur: intent bir aksiyon gerektiriyorsa Agent Runtime
 * üzerinden agent oluşturulur; tehlikeli adımlar Approval Queue'da bekler.
 */

interface IntentRule {
  intent: VoiceIntentName;
  pattern: RegExp;
  extract?: (match: RegExpMatchArray, text: string) => Record<string, string>;
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'task.create',
    pattern: /(?:görev(?:i)? (?:oluştur|ekle|yarat))|(?:yeni görev)|(?:create task)|(?:add task)/i,
    extract: (_m, text) => ({ goal: text }),
  },
  {
    // "görevlerim neler", "bugünkü görevler", "günün görevleri" — doğal konuşma
    intent: 'task.query',
    pattern:
      /görevler(?:im)?\b|bugünkü görev|günün görev|bekleyen görev|list tasks|my tasks|what.*tasks/i,
  },
  {
    intent: 'project.status',
    pattern: /proje(?:ler)?(?:imin|min)? durum|project status|projeler nasıl/i,
  },
  {
    // Sembol ZORUNLU — "analiz et" tek başına trading değil (dosya analizi olabilir)
    intent: 'trading.analysis',
    pattern:
      /(?<symbol>[A-Z]{2,10}(?:USDT|USD|TRY))\s*(?:analiz|analysis|yorumla)|(?:analiz et)\s+(?<symbol2>[A-Z]{2,10}(?:USDT|USD|TRY))/i,
    extract: (m) => ({
      symbol: (m.groups?.symbol ?? m.groups?.symbol2 ?? 'BTCUSDT').toUpperCase(),
    }),
  },
  {
    // "trading nasıl", "portföyüm nasıl", "trading nasıl gidiyor" — doğal konuşma
    intent: 'trading.status',
    pattern:
      /trading\s*(?:nasıl|durum|ne durumda|gidiyor)|portföy(?:üm)?(?:\s*nasıl|\s*durumu)?|pozisyon(?:lar)?(?:ım)?\s*(?:ne durumda|nasıl|göster)|kâr.?zarar/i,
  },
  {
    // Knowledge Graph recall: "geçen hafta BTC hakkında ne karar vermiştim?"
    intent: 'memory.recall',
    pattern:
      /(?:ne karar|karar ver(?:miştim|dim)|hakkında ne|hatırlıyor musun|neler olmuştu|what did i decide)/i,
    extract: (_m, text) => {
      // Yalnız BÜYÜK harfli semboller (BTC, BTCUSDT) — i flag'i cümle başı
      // kelimeleri sembol sanır
      const symbolMatch = text.match(/\b([A-Z]{2,10}(?:USDT|USD|TRY)?)\b/);
      const lastWeek = /geçen hafta|last week/i.test(text);
      return {
        topic: symbolMatch ? symbolMatch[1]! : text,
        ...(lastWeek ? { period: 'last_week' } : {}),
      };
    },
  },
  {
    // "Hey APEX, ekranda ne görüyorsun?"
    intent: 'screen.describe',
    pattern:
      /ekran(?:da|ı)?\s*(?:ne|neler)\s*(?:görüyorsun|var|oluyor)|what.*(?:on|see).*screen|ekranı? (?:oku|anlat|açıkla)/i,
  },
  {
    // "Bu PDF'yi özetle." — Türkçe ek ('yi/'yı/'i/nin) apostrofuyla
    intent: 'file.summarize',
    pattern:
      /(?:bu\s+)?(?:pdf|dosya|belge|dökuman|doküman)(?:['’‘]?[a-zçğıöşü]{0,4})?\s*(?:özetle|özet|summarize)|summarize.*(?:pdf|file|document)/i,
    extract: (_m, text) => ({ fileName: text.match(/([\w.-]+\.\w{2,5})/)?.[1] ?? '' }),
  },
  {
    // "Bu hata neden oluyor?"
    intent: 'error.explain',
    pattern:
      /(?:bu\s+)?hata\s*(?:neden|niçin|niye)|why.*(?:this\s+)?error|hatayı? açıkla|explain.*error/i,
  },
  {
    // "Bu Excel dosyasını analiz et."
    intent: 'file.analyze',
    pattern:
      /(?:bu\s+)?(?:excel|xlsx|csv|spreadsheet|tablo)(?:\s+dosyas[iı]?n[iı]?)?\s*(?:analiz\s*et|analiz|incele|analyze)|analyze.*(?:excel|spreadsheet|csv)/i,
    extract: (_m, text) => ({ fileName: text.match(/([\w.-]+\.\w{2,5})/)?.[1] ?? '' }),
  },
  {
    // "Proje oluştur"
    intent: 'project.create',
    pattern: /proje\s*(?:oluştur|yarat|ekle|aç)|(?:yeni|new)\s+proje|create\s+project/i,
    extract: (_m, text) => ({ goal: text }),
  },
  {
    // "Tüm pozisyonları kapat" — riskli, onay gerektirir
    intent: 'trading.closeAll',
    pattern:
      /(?:tüm|bütün|hepsini?)\s*pozisyon(?:lar)?(?:ı|ları)?\s*kapat|close\s+all\s+positions|pozisyonları kapat/i,
  },
  {
    // "Risk raporu" / "risk durumu"
    intent: 'trading.riskReport',
    pattern: /risk\s*(?:raporu|durumu|report)|risk nasıl/i,
  },
  {
    // "Bugünkü PnL" / "günlük kâr zarar"
    intent: 'trading.pnl',
    pattern: /(?:bugünkü|günlük|today)\s*(?:pnl|kâr.?zarar|kazanç)|pnl.*(?:nedir|ne kadar)/i,
  },
  {
    // "Market tara" / "piyasayı tara"
    intent: 'market.scan',
    pattern: /market\s*(?:tara|scan)|piyasa(?:yı)?\s*(?:tara|scan|kontrol)|scan\s+market/i,
  },
  {
    // "Clipboard oku" / "panoyu oku"
    intent: 'clipboard.read',
    pattern:
      /clipboard\s*(?:oku|göster|ne)|pano(?:yu|da)?\s*(?:oku|göster|ne var)|read\s+clipboard/i,
  },
  {
    // "Workflow başlat" / "iş akışı başlat"
    intent: 'workflow.start',
    pattern:
      /workflow\s*(?:başlat|çalıştır|start)|iş\s*akış[ıi]?(?:n[ıi])?\s*(?:başlat|çalıştır)|start\s+workflow/i,
    extract: (_m, text) => ({ goal: text }),
  },
  {
    // "Rapor oluştur"
    intent: 'report.generate',
    pattern: /rapor\s*(?:oluştur|hazırla|çıkar|ver)|(?:generate|create)\s+report/i,
  },
  {
    intent: 'executive.chat',
    pattern: /apex|executive|asistan|öneri|bugün ne yap/i,
  },
];

export function parseVoiceIntent(text: string): VoiceIntent {
  const trimmed = text.trim();
  for (const rule of INTENT_RULES) {
    const match = trimmed.match(rule.pattern);
    if (match) {
      return {
        intent: rule.intent,
        confidence: 0.9,
        params: rule.extract ? rule.extract(match, trimmed) : {},
        rawText: trimmed,
      };
    }
  }
  return { intent: 'unknown', confidence: 0, params: {}, rawText: trimmed };
}

export async function handleVoiceIntent(intent: VoiceIntent): Promise<VoiceResponse> {
  const now = new Date().toISOString();

  switch (intent.intent) {
    case 'task.create': {
      // Agent Runtime üzerinden — onay mimarisi otomatik korunur
      const agent = createAgent({
        name: 'Voice Görev Ajanı',
        goal: intent.params.goal ?? intent.rawText,
      });
      return {
        intent: intent.intent,
        speech: `Görev ajanı oluşturdum: ${agent.plan?.totalSteps ?? 0} adım planlandı. Onay gereken adımlar bekleyecek.`,
        data: { agentId: agent.id, steps: agent.plan?.totalSteps ?? 0 },
        requiresApproval: agent.plan?.steps.some((s) => s.requiresApproval) ?? false,
        handledAt: now,
      };
    }

    case 'task.query': {
      const entries = getMemoryStore().getTimeline(undefined, undefined, 5);
      return {
        intent: intent.intent,
        speech:
          entries.length === 0
            ? 'Kayıtlı aktivite bulunamadı.'
            : `Son ${entries.length} aktivite: ${entries.map((e) => e.title).join('; ')}`,
        data: { entries: entries.map((e) => ({ title: e.title, timestamp: e.timestamp })) },
        requiresApproval: false,
        handledAt: now,
      };
    }

    case 'project.status': {
      const stats = getMemoryStore().getStats();
      return {
        intent: intent.intent,
        speech: `Sistemde ${stats.projects} proje notu, ${stats.timelineEntries} zaman çizelgesi kaydı ve ${stats.decisions} karar var.`,
        data: stats as unknown as Record<string, unknown>,
        requiresApproval: false,
        handledAt: now,
      };
    }

    case 'trading.status': {
      const summary = await getTradingStatusSummary();
      const pnlWord = summary.todayPnl >= 0 ? 'kârda' : 'zararda';
      return {
        intent: intent.intent,
        speech: `Paper portföy ${summary.equity} USDT. Bugün ${Math.abs(summary.todayPnl)} USDT ${pnlWord}. ${summary.openPositionCount} açık pozisyon var.`,
        data: summary as unknown as Record<string, unknown>,
        requiresApproval: false,
        handledAt: now,
      };
    }

    case 'trading.analysis': {
      const symbol = intent.params.symbol ?? 'BTCUSDT';
      const agent = createAgent({
        name: `Voice Trading Ajanı: ${symbol}`,
        goal: `Trading analizi yap: ${symbol}`,
      });
      return {
        intent: intent.intent,
        speech: `${symbol} için trading ajanı başlattım. Analiz ve risk kontrolü otomatik; emir adımı onayına sunulacak.`,
        data: { agentId: agent.id, symbol },
        requiresApproval: true,
        handledAt: now,
      };
    }

    case 'memory.recall': {
      // Knowledge Graph üzerinden hatırlama — hibrit arama (keyword+tip+timeline)
      const dateFrom =
        intent.params.period === 'last_week'
          ? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
          : undefined;
      const search = searchKnowledge({
        keyword: intent.params.topic ?? intent.rawText,
        types: ['decision', 'trade', 'note'],
        dateFrom,
        limit: 5,
      });
      if (search.results.length === 0) {
        return {
          intent: intent.intent,
          speech: `${intent.params.topic ?? 'Bu konu'} hakkında graph'ta kayıtlı karar bulamadım.`,
          data: { results: [], durationMs: search.durationMs },
          requiresApproval: false,
          handledAt: now,
        };
      }
      const top = search.results.map((r) => r.node);
      const decisions = top.filter((n) => n.type === 'decision');
      const speech =
        decisions.length > 0
          ? `${decisions.length} karar buldum: ${decisions.map((d) => d.name).join('; ')}${decisions[0]?.content ? `. Detay: ${decisions[0].content.slice(0, 120)}` : ''}`
          : `Doğrudan karar yok ama ${top.length} ilgili kayıt var: ${top.map((n) => `${n.name} (${n.type})`).join('; ')}`;
      return {
        intent: intent.intent,
        speech,
        data: {
          results: top.map((n) => ({
            type: n.type,
            name: n.name,
            content: n.content,
            updatedAt: n.updatedAt,
          })),
          durationMs: search.durationMs,
        },
        requiresApproval: false,
        handledAt: now,
      };
    }

    case 'screen.describe': {
      const { speech, data } = describeScreen();
      return { intent: intent.intent, speech, data, requiresApproval: false, handledAt: now };
    }

    case 'error.explain': {
      const { speech, data } = explainScreenError();
      return { intent: intent.intent, speech, data, requiresApproval: false, handledAt: now };
    }

    case 'file.summarize':
    case 'file.analyze': {
      const { speech, data } = getRecentFileInsightsForVoice(intent.params.fileName || undefined);
      return { intent: intent.intent, speech, data, requiresApproval: false, handledAt: now };
    }

    case 'project.create': {
      // Agent Runtime üzerinden — onay mimarisi korunur
      const agent = createAgent({
        name: 'Voice Proje Ajanı',
        goal: intent.params.goal ?? intent.rawText,
      });
      return {
        intent: intent.intent,
        speech: `Proje ajanı oluşturdum: ${agent.plan?.totalSteps ?? 0} adım planlandı.`,
        data: { agentId: agent.id, steps: agent.plan?.totalSteps ?? 0 },
        requiresApproval: agent.plan?.steps.some((s) => s.requiresApproval) ?? false,
        handledAt: now,
      };
    }

    case 'trading.closeAll': {
      // "Tüm pozisyonları kapat" — riskli, onay üzerinden (agent değil, doğrudan uyarı)
      const summary = await liveTradingSummary().catch(() => null);
      return {
        intent: intent.intent,
        speech: `${summary?.openPositions ?? 0} açık pozisyon var. Tüm pozisyonları kapatmak onay gerektirir — Onay Merkezi'nden veya pozisyon ekranından kapat.`,
        data: { openPositions: summary?.openPositions ?? 0 } as Record<string, unknown>,
        requiresApproval: true,
        handledAt: now,
      };
    }

    case 'trading.riskReport': {
      const risk = getRiskProfileV2();
      const summary = await liveTradingSummary().catch(() => null);
      return {
        intent: intent.intent,
        speech: `Risk raporu: max günlük zarar %${risk.maxDailyLossPercent}, max açık pozisyon ${risk.maxOpenPositions}, max kaldıraç ${risk.maxLeverage}x. Şu an ${summary?.openPositions ?? 0} pozisyon, exposure %${summary?.exposurePercent ?? 0}, drawdown %${summary?.drawdown ?? 0}.`,
        data: { risk, summary } as unknown as Record<string, unknown>,
        requiresApproval: false,
        handledAt: now,
      };
    }

    case 'trading.pnl': {
      const summary = await liveTradingSummary().catch(() => null);
      const pnl = summary?.dailyPnl ?? 0;
      return {
        intent: intent.intent,
        speech: `Bugünkü PnL: ${pnl >= 0 ? '+' : ''}${pnl} USDT. Equity ${summary?.equity ?? 0}, win rate %${summary?.winRate ?? 0}, realize ${summary?.realizedPnl ?? 0}.`,
        data: summary as unknown as Record<string, unknown>,
        requiresApproval: false,
        handledAt: now,
      };
    }

    case 'market.scan': {
      // Gerçek market taraması — varsayılan watchlist tickerları (mevcut quant servisi)
      const watchlist = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
      const scans = await Promise.all(
        watchlist.map(async (symbol) => {
          try {
            const snap = await getMarketSnapshot('okx', symbol, '1h', 50);
            return {
              symbol,
              price: snap.ticker.lastPrice,
              change: snap.ticker.priceChangePercent24h,
              trend: snap.analysis.trend.direction,
            };
          } catch {
            return null;
          }
        }),
      );
      const valid = scans.filter((s): s is NonNullable<typeof s> => s !== null);
      const speech = valid.length
        ? `Market taraması: ${valid.map((s) => `${s.symbol} ${s.price} (24s %${s.change.toFixed(1)}, ${s.trend})`).join('; ')}`
        : 'Market verisi alınamadı (borsa erişimi gerekli).';
      return {
        intent: intent.intent,
        speech,
        data: { scans: valid },
        requiresApproval: false,
        handledAt: now,
      };
    }

    case 'clipboard.read': {
      const history = getClipboardHistory(3);
      const speech = history.length
        ? `Son clipboard: ${history.map((c) => `${c.kind} — ${c.content.slice(0, 60)}`).join('; ')}`
        : 'Clipboard geçmişi boş.';
      return {
        intent: intent.intent,
        speech,
        data: { history },
        requiresApproval: false,
        handledAt: now,
      };
    }

    case 'workflow.start': {
      const agent = createAgent({
        name: 'Voice İş Akışı Ajanı',
        goal: intent.params.goal ?? intent.rawText,
      });
      return {
        intent: intent.intent,
        speech: `İş akışı ajanı başlattım: ${agent.plan?.totalSteps ?? 0} adım. Onay gereken adımlar bekleyecek.`,
        data: { agentId: agent.id },
        requiresApproval: agent.plan?.steps.some((s) => s.requiresApproval) ?? false,
        handledAt: now,
      };
    }

    case 'report.generate': {
      const stats = getMemoryStore().getStats();
      const trading = await getTradingStatusSummary().catch(() => null);
      const speech = `Rapor hazır: ${stats.timelineEntries} kayıt, ${stats.decisions} karar${trading ? `, portföy ${trading.equity} USDT (bugün ${trading.todayPnl >= 0 ? '+' : ''}${trading.todayPnl})` : ''}.`;
      return {
        intent: intent.intent,
        speech,
        data: { stats, trading } as unknown as Record<string, unknown>,
        requiresApproval: false,
        handledAt: now,
      };
    }

    case 'executive.chat': {
      return {
        intent: intent.intent,
        speech:
          'APEX Executive hazır. Görev oluşturma, portföy durumu, sembol analizi veya "ekranda ne görüyorsun" diyebilirsin.',
        data: null,
        requiresApproval: false,
        handledAt: now,
      };
    }

    default:
      return {
        intent: 'unknown',
        speech:
          'Bunu anlayamadım. Örnek: "yeni görev oluştur", "portföyüm nasıl", "BTCUSDT analiz et".',
        data: null,
        requiresApproval: false,
        handledAt: now,
      };
  }
}

export async function processVoiceCommand(text: string): Promise<VoiceResponse> {
  return handleVoiceIntent(parseVoiceIntent(text));
}
