import type { ContentKind, DetectedLanguage, SupportedFileType } from './types';

// İçerik sınıflandırma — saf, deterministik. Ham metin + uygulama/pencere
// ipucundan içerik tipi ve dil çıkarır. OCR ve File Insight paylaşır (duplicate yok).

// Türkçe'ye özgü karakterler ve yüksek frekanslı kelimeler
const TR_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
const TR_STOPWORDS = new Set([
  've',
  'bir',
  'bu',
  'için',
  'ile',
  'da',
  'de',
  'çok',
  'daha',
  'ama',
  'veya',
  'gibi',
  'kadar',
  'sonra',
  'önce',
  'değil',
  'olarak',
  'her',
  'ya',
  'ki',
  'mi',
]);
const EN_STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'from',
  'have',
  'not',
  'are',
  'was',
  'will',
  'can',
  'has',
  'but',
  'you',
  'all',
  'any',
  'been',
  'more',
]);

export function detectLanguage(text: string): DetectedLanguage {
  const sample = text.slice(0, 2000).toLowerCase();
  if (sample.trim().length === 0) return { language: 'unknown', confidence: 0 };

  const words = sample.split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return { language: 'unknown', confidence: 0 };

  let trHits = 0;
  let enHits = 0;
  for (const word of words) {
    const clean = word.replace(/[^a-zçğıöşü]/g, '');
    if (TR_STOPWORDS.has(clean)) trHits++;
    if (EN_STOPWORDS.has(clean)) enHits++;
  }

  // Türkçe karakter varlığı güçlü sinyal
  const trCharBonus = TR_CHARS.test(text)
    ? Math.min(0.3, (text.match(TR_CHARS)?.length ?? 0) / 100)
    : 0;
  const trScore = trHits / words.length + trCharBonus;
  const enScore = enHits / words.length;

  if (trScore === 0 && enScore === 0) return { language: 'unknown', confidence: 0.2 };
  if (trScore >= enScore) {
    return { language: 'tr', confidence: Math.min(0.99, 0.5 + trScore * 3) };
  }
  return { language: 'en', confidence: Math.min(0.99, 0.5 + enScore * 3) };
}

const CODE_SIGNALS = [
  /\b(function|const|let|var|import|export|class|def|return|async|await)\b/,
  /[{}();]\s*$/m,
  /=>|::|->|&&|\|\||===|!==/,
  /^\s*(import|from|package|using|#include)\b/m,
];

const TERMINAL_SIGNALS = [
  /^\$\s|\bnpm\b|\bpnpm\b|\bgit\b|\bcurl\b|\bcd\b|\bls\b|\bsudo\b/m,
  /\berror\b:|\bwarning\b:|command not found|exit code/i,
  /^\S+@\S+[:~]/m,
];

export function classifyContent(
  text: string,
  hint?: { app?: string; windowTitle?: string; fileName?: string },
): ContentKind {
  const app = hint?.app?.toLowerCase() ?? '';
  const title = hint?.windowTitle?.toLowerCase() ?? '';
  const fileName = hint?.fileName?.toLowerCase() ?? '';

  // Dosya uzantısı en güçlü sinyal
  if (fileName) {
    const ext = fileName.split('.').pop() ?? '';
    const byExt: Record<string, ContentKind> = {
      pdf: 'pdf',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      webp: 'image',
      xlsx: 'spreadsheet',
      xls: 'spreadsheet',
      csv: 'csv',
      docx: 'document',
      doc: 'document',
      pptx: 'presentation',
      ppt: 'presentation',
      md: 'markdown',
      markdown: 'markdown',
      json: 'json',
      xml: 'xml',
      txt: 'plaintext',
      log: 'terminal',
      html: 'webpage',
      htm: 'webpage',
    };
    if (byExt[ext]) return byExt[ext];
  }

  // Uygulama ipucu
  if (app.includes('excel') || app.includes('numbers') || title.includes('.xlsx'))
    return 'spreadsheet';
  if (app.includes('word') || title.includes('.docx')) return 'document';
  if (app.includes('powerpoint') || app.includes('keynote')) return 'presentation';
  if (app.includes('terminal') || app.includes('iterm') || app.includes('warp')) return 'terminal';
  if (app.includes('preview') || app.includes('acrobat') || title.includes('.pdf')) return 'pdf';
  if (
    app.includes('chrome') ||
    app.includes('safari') ||
    app.includes('edge') ||
    app.includes('brave') ||
    app.includes('firefox')
  )
    return 'webpage';

  const trimmed = text.trim();
  if (trimmed.length === 0) return 'unknown';

  // Yapılandırılmış format tespiti
  if (/^\s*[{[]/.test(trimmed) && /[}\]]\s*$/.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // JSON değil, devam
    }
  }
  if (/^\s*<\?xml|^\s*<[a-z]+[\s>]/i.test(trimmed)) return 'xml';

  // İçerik-tabanlı sinyaller
  const terminalScore = TERMINAL_SIGNALS.filter((r) => r.test(text)).length;
  const codeScore = CODE_SIGNALS.filter((r) => r.test(text)).length;
  if (terminalScore >= 2) return 'terminal';
  if (codeScore >= 2) return 'code';

  // CSV: birden çok satır, tutarlı virgül sayısı
  const lines = trimmed.split('\n').filter((l) => l.trim());
  if (lines.length >= 2) {
    const commaCounts = lines.slice(0, 5).map((l) => (l.match(/,/g) ?? []).length);
    if (commaCounts[0]! >= 1 && commaCounts.every((c) => c === commaCounts[0])) return 'csv';
  }

  if (/^#{1,6}\s|\*\*|\[.+\]\(.+\)/m.test(text)) return 'markdown';

  return 'plaintext';
}

export function fileTypeFromName(fileName: string): SupportedFileType | 'unknown' {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  const map: Record<string, SupportedFileType> = {
    pdf: 'pdf',
    docx: 'docx',
    xlsx: 'xlsx',
    pptx: 'pptx',
    txt: 'txt',
    md: 'md',
    csv: 'csv',
    json: 'json',
    xml: 'xml',
  };
  return map[ext] ?? 'unknown';
}

/** Metinden yapılandırılmış öğeler çıkar — URL, dosya yolu, kod sembolü, sayı. */
export function extractStructured(text: string): {
  urls: string[];
  filePaths: string[];
  codeSymbols: string[];
  numbers: string[];
} {
  const urls = [...new Set(text.match(/https?:\/\/[^\s"'<>)]+/g) ?? [])].slice(0, 20);
  const filePaths = [...new Set(text.match(/(?:\/[\w.-]+){2,}|[A-Za-z]:\\[\w\\.-]+/g) ?? [])]
    .filter((p) => !p.startsWith('http'))
    .slice(0, 20);
  const codeSymbols = [
    ...new Set(text.match(/\b[a-z][a-zA-Z0-9]*(?=\()|\b[A-Z][a-zA-Z0-9]+\b/g) ?? []),
  ].slice(0, 30);
  const numbers = [...new Set(text.match(/\b\d[\d.,]*\b/g) ?? [])].slice(0, 20);
  return { urls, filePaths, codeSymbols, numbers };
}
