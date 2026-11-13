import type { WakeWordDetector, WakeWordResult } from './types';

// Wake Word — "Hey APEX". Ham audio DSP istemci-tarafı (browser Web Audio,
// Porcupine, native ML). Bu katman transkript snippet'ini skorlar: fuzzy eşleşme
// + false-positive azaltma (min güven + cooldown). Event-driven, poll YOK.

const WAKE_VARIANTS = [
  'hey apex',
  'hey apeks',
  'hey apex',
  'hi apex',
  'hey epex',
  'hey apex',
  'hey apecs',
  'ey apex',
  'hey abex',
  'hey apex os',
  'apex',
];

// Levenshtein — fuzzy tolerans (STT hataları)
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

function scoreWake(transcript: string): { confidence: number; phrase: string } {
  const norm = transcript
    .toLocaleLowerCase('tr')
    .trim()
    .replace(/[^\wçğıöşü\s]/g, '');
  // İlk 4 kelimeye bak (wake word başta olmalı — sonda ise false positive)
  const head = norm.split(/\s+/).slice(0, 4).join(' ');

  let best = 0;
  let bestPhrase = '';
  for (const variant of WAKE_VARIANTS) {
    // Tam alt-dizi eşleşmesi → yüksek güven
    if (head.includes(variant)) {
      const conf = variant === 'apex' ? 0.75 : 0.98;
      if (conf > best) {
        best = conf;
        bestPhrase = variant;
      }
      continue;
    }
    // Fuzzy: normalized edit distance
    const dist = levenshtein(head.slice(0, variant.length + 3), variant);
    const sim = 1 - dist / Math.max(variant.length, 1);
    if (sim > best) {
      best = sim;
      bestPhrase = variant;
    }
  }
  return { confidence: Number(best.toFixed(3)), phrase: bestPhrase };
}

/**
 * Varsayılan detektör: fuzzy "hey apex" skoru + false-positive azaltma.
 * Cooldown ile art arda tetiklemeyi engeller (gerçek — istemci audio besler).
 */
const g = globalThis as unknown as {
  __apexWakeDetector?: WakeWordDetector;
  __apexLastWakeAt?: number;
};

const COOLDOWN_MS = 1500;

const defaultDetector: WakeWordDetector = {
  name: 'fuzzy-keyword',
  detect(transcript: string, threshold: number = 0.85): WakeWordResult {
    const { confidence, phrase } = scoreWake(transcript);
    const now = Date.now();
    const sinceLast = now - (g.__apexLastWakeAt ?? 0);

    if (confidence < threshold) {
      return {
        detected: false,
        confidence,
        phrase,
        falsePositiveFiltered: false,
        reason: 'eşik altı güven',
      };
    }
    // False-positive azaltma: cooldown penceresi
    if (sinceLast < COOLDOWN_MS) {
      return {
        detected: false,
        confidence,
        phrase,
        falsePositiveFiltered: true,
        reason: 'cooldown (art arda tetik)',
      };
    }
    // False-positive: çok uzun cümlede gömülü "apex" (bahsetme, komut değil)
    const wordCount = transcript.trim().split(/\s+/).length;
    if (phrase === 'apex' && wordCount > 5) {
      return {
        detected: false,
        confidence,
        phrase,
        falsePositiveFiltered: true,
        reason: 'cümle içi bahsetme',
      };
    }

    g.__apexLastWakeAt = now;
    return { detected: true, confidence, phrase, falsePositiveFiltered: false };
  },
};

export function registerWakeWordDetector(detector: WakeWordDetector): void {
  g.__apexWakeDetector = detector;
}

export function detectWakeWord(transcript: string, threshold = 0.85): WakeWordResult {
  const detector = g.__apexWakeDetector ?? defaultDetector;
  return detector.detect(transcript, threshold);
}

export function getWakeWordDetectorName(): string {
  return (g.__apexWakeDetector ?? defaultDetector).name;
}

export function resetWakeCooldown(): void {
  g.__apexLastWakeAt = 0;
}
