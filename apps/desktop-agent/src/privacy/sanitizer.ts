export interface SensitivePattern {
  name: string;
  pattern: RegExp;
}

// Order matters: JWT/SSH before generic secret/password to avoid double-masking artifacts.
const PATTERNS: SensitivePattern[] = [
  {
    name: 'SSH_KEY',
    pattern:
      /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/g,
  },
  { name: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { name: 'BEARER_TOKEN', pattern: /\bBearer\s+[A-Za-z0-9\-_.]{10,}/gi },
  {
    name: 'API_KEY',
    pattern: /\b(?:api[_-]?key|apikey|access[_-]?token)\s*[:=]\s*['"]?[\w-]{12,}['"]?/gi,
  },
  { name: 'SECRET', pattern: /\b(?:secret|client[_-]?secret)\s*[:=]\s*['"]?[\w-]{8,}['"]?/gi },
  { name: 'COOKIE', pattern: /\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{6,}/gi },
  { name: 'PASSWORD', pattern: /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/gi },
  { name: 'IBAN', pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { name: 'CREDIT_CARD', pattern: /\b(?:\d[ -]?){13,19}\b/g },
  { name: 'TC_KIMLIK', pattern: /\b[1-9]\d{10}\b/g },
];

export function getSensitivePatternNames(): string[] {
  return PATTERNS.map((p) => p.name);
}

export function containsSensitiveData(text: string): boolean {
  if (!text) return false;
  return PATTERNS.some(({ pattern }) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

export function maskSensitiveData(text: string): string {
  if (!text) return text;
  let result = text;
  for (const { name, pattern } of PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, `[REDACTED:${name}]`);
  }
  return result;
}
