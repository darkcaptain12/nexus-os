import type { InstallationState, InstallStep, InstallStepId } from './types';
import { isSupabaseConfigured } from '@/lib/supabase/health';

// Installation Wizard — ilk açılış kurulum adımları durumu. Her adım env
// yapılandırmasından OKUNUR (yeni state tutmaz). Supabase temel; kalanlar
// canlı servis için opsiyonel (graceful degradation).

interface StepSpec {
  id: InstallStepId;
  title: string;
  required: boolean;
  envKeys: string[];
  instructions: string;
  docLink: string;
  isComplete: () => boolean;
}

const STEP_SPECS: StepSpec[] = [
  {
    id: 'supabase',
    title: 'Supabase Bağlantısı',
    required: true,
    envKeys: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    instructions:
      "supabase.com'da proje oluştur, URL + anon key .env.local'e ekle, migration'ları çalıştır.",
    docLink: 'docs/installation.md#supabase',
    isComplete: () => isSupabaseConfigured(),
  },
  {
    id: 'api-keys',
    title: 'AI API Key',
    required: false,
    envKeys: ['ANTHROPIC_API_KEY'],
    instructions: 'Anthropic (veya OpenAI) API key ekle — Executive/Agent/Voice AI için.',
    docLink: 'docs/installation.md#ai',
    isComplete: () => !!process.env.ANTHROPIC_API_KEY || !!process.env.OPENAI_API_KEY,
  },
  {
    id: 'trading-api',
    title: 'Trading API (OKX)',
    required: false,
    envKeys: ['OKX_API_KEY', 'OKX_API_SECRET'],
    instructions:
      "OKX API key + secret ekle — canlı market data + paper trading için. Emir gönderimi Approval Queue'dan geçer.",
    docLink: 'docs/trading.md',
    isComplete: () => !!process.env.OKX_API_KEY && !!process.env.OKX_API_SECRET,
  },
  {
    id: 'commerce-api',
    title: 'Commerce API (Shopify)',
    required: false,
    envKeys: ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET'],
    instructions: 'Shopify API bilgilerini ekle — ürün/sipariş/reklam yönetimi için.',
    docLink: 'docs/commerce.md',
    isComplete: () => !!process.env.SHOPIFY_API_KEY && !!process.env.SHOPIFY_API_SECRET,
  },
  {
    id: 'notification',
    title: 'Notification Provider',
    required: false,
    envKeys: ['TELEGRAM_BOT_TOKEN', 'DISCORD_WEBHOOK_URL'],
    instructions:
      'Telegram bot token veya Discord webhook ekle — kritik alert/onay bildirimleri için.',
    docLink: 'docs/notifications.md',
    isComplete: () => !!process.env.TELEGRAM_BOT_TOKEN || !!process.env.DISCORD_WEBHOOK_URL,
  },
  {
    id: 'voice',
    title: 'Voice Provider',
    required: false,
    envKeys: ['VOICE_PROVIDER_KEY'],
    instructions:
      'STT/TTS sağlayıcı key ekle — "Hey APEX" sesli komut için. İstemci-tarafı ML Kit alternatifi mevcut.',
    docLink: 'docs/voice.md',
    isComplete: () => !!process.env.VOICE_PROVIDER_KEY,
  },
  {
    id: 'desktop-agent',
    title: 'Desktop Agent',
    required: false,
    envKeys: ['DESKTOP_AGENT_TOKEN'],
    instructions: 'Desktop Agent uygulamasını kur, token ile eşle — ekran/aktivite/OCR için.',
    docLink: 'docs/desktop.md',
    isComplete: () => !!process.env.DESKTOP_AGENT_TOKEN,
  },
  {
    id: 'cloud-sync',
    title: 'Cloud Sync',
    required: false,
    envKeys: ['NEXT_PUBLIC_SUPABASE_URL'],
    instructions: "Cloud Sync Supabase üstünde çalışır — cihaz eşleştirme dashboard'dan yapılır.",
    docLink: 'docs/cloud.md',
    isComplete: () => isSupabaseConfigured(),
  },
];

function buildStep(spec: StepSpec): InstallStep {
  const complete = spec.isComplete();
  return {
    id: spec.id,
    title: spec.title,
    status: complete ? 'complete' : spec.required ? 'incomplete' : 'optional',
    required: spec.required,
    envKeys: spec.envKeys,
    instructions: spec.instructions,
    docLink: spec.docLink,
  };
}

export function getInstallationState(): InstallationState {
  const steps = STEP_SPECS.map(buildStep);
  const completed = steps.filter((s) => s.status === 'complete').length;
  const requiredComplete = steps.filter((s) => s.required).every((s) => s.status === 'complete');
  // Minimum viable: Supabase + auth (temel dashboard/memory/executive çalışır)
  const minimumViable = requiredComplete;
  const nextStep =
    steps.find((s) => s.status === 'incomplete')?.id ??
    steps.find((s) => s.status === 'optional')?.id ??
    null;

  return {
    completed,
    total: steps.length,
    requiredComplete,
    minimumViable,
    steps,
    nextStep,
    generatedAt: new Date().toISOString(),
  };
}
