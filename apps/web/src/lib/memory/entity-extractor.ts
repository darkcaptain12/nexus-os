export interface ExtractedEntity {
  name: string;
  type: 'person' | 'company' | 'project' | 'technology' | 'date' | 'location' | 'product';
  confidence: number;
}

const TECH_KEYWORDS = new Set([
  'react',
  'next.js',
  'typescript',
  'javascript',
  'python',
  'supabase',
  'postgresql',
  'tailwind',
  'docker',
  'kubernetes',
  'aws',
  'vercel',
  'github',
  'redis',
  'graphql',
  'node.js',
  'express',
  'prisma',
  'mongodb',
  'firebase',
  'stripe',
  'openai',
  'anthropic',
]);

const DATE_PATTERN =
  /\b(\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Pazartesi|Salı|Çarşamba|Perşembe|Cuma|Cumartesi|Pazar)|(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{1,2})\b/gi;
const CAPITALIZED_PATTERN = /\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)+\b/g;

export function extractEntities(content: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  const words = content.toLowerCase().split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[.,;:!?()[\]{}]/g, '');
    if (TECH_KEYWORDS.has(clean) && !seen.has(clean)) {
      seen.add(clean);
      entities.push({ name: clean, type: 'technology', confidence: 0.9 });
    }
  }

  const dateMatches = content.match(DATE_PATTERN);
  if (dateMatches) {
    for (const match of dateMatches) {
      if (!seen.has(match)) {
        seen.add(match);
        entities.push({ name: match, type: 'date', confidence: 0.85 });
      }
    }
  }

  const capitalizedMatches = content.match(CAPITALIZED_PATTERN);
  if (capitalizedMatches) {
    for (const match of capitalizedMatches) {
      if (!seen.has(match.toLowerCase()) && match.split(' ').length <= 4) {
        seen.add(match.toLowerCase());
        entities.push({ name: match, type: 'person', confidence: 0.6 });
      }
    }
  }

  return entities.sort((a, b) => b.confidence - a.confidence);
}
