import { NextResponse } from 'next/server';
import { createLogger } from '@apex-os/logger';
import { generateCorrelationId } from './index';
import { getErrorRegistry } from './error-registry';
import type { ErrorClassification, ErrorSeverity } from './types';

export type { ErrorClassification, ErrorSeverity } from './types';

export interface ClassifiedError {
  code: string;
  classification: ErrorClassification;
  severity: ErrorSeverity;
  retryable: boolean;
  userMessage: string;
  requestId: string;
  timestamp: string;
}

const log = createLogger({ service: 'apex-web', module: 'error-boundary' });

const USER_MESSAGES: Record<ErrorClassification, string> = {
  validation: 'Gönderilen veri geçersiz. Lütfen alanları kontrol edin.',
  auth: 'Oturum doğrulanamadı. Lütfen tekrar giriş yapın.',
  authorization: 'Bu işlem için yetkiniz yok.',
  not_found: 'Aradığınız kayıt bulunamadı.',
  database: 'Veritabanı işlemi başarısız oldu. Lütfen tekrar deneyin.',
  external: 'Dış servis yanıt vermiyor. Lütfen daha sonra tekrar deneyin.',
  workflow: 'İş akışı çalıştırılırken bir hata oluştu.',
  ai: 'Yapay zeka servisi yanıt vermiyor. Lütfen daha sonra tekrar deneyin.',
  desktop: 'Masaüstü ajanına ulaşılamıyor.',
  integration: 'Entegrasyon servisinde bir hata oluştu.',
  internal: 'Beklenmeyen bir hata oluştu.',
};

/**
 * Order matters: more specific multi-word phrases (workflow/ai/desktop/
 * integration) are checked before the generic external/database fallbacks
 * so a message like "AI provider fetch failed" classifies as 'ai', not
 * 'external'. None of these new patterns overlap with the original 6
 * classes' trigger words (validation/auth/not_found/database/external/
 * internal keep their exact prior behavior for the same inputs).
 */
function classify(err: unknown): { classification: ErrorClassification; code: string } {
  if (err instanceof Error) {
    const message = err.message.toLowerCase();

    if (
      message.includes('forbidden') ||
      message.includes('permission denied') ||
      message.includes('insufficient permission')
    ) {
      return { classification: 'authorization', code: 'AUTHORIZATION_ERROR' };
    }
    if (
      message.includes('jwt') ||
      message.includes('unauthorized') ||
      message.includes('not authenticated')
    ) {
      return { classification: 'auth', code: 'AUTH_ERROR' };
    }
    if (message.includes('not found') || message.includes('no rows')) {
      return { classification: 'not_found', code: 'NOT_FOUND' };
    }
    if (
      message.includes('violates') ||
      message.includes('constraint') ||
      message.includes('duplicate key')
    ) {
      return { classification: 'validation', code: 'VALIDATION_ERROR' };
    }
    if (message.includes('workflow')) {
      return { classification: 'workflow', code: 'WORKFLOW_ERROR' };
    }
    if (message.includes('ai provider') || message.includes('ai executive')) {
      return { classification: 'ai', code: 'AI_ERROR' };
    }
    if (message.includes('desktop agent')) {
      return { classification: 'desktop', code: 'DESKTOP_ERROR' };
    }
    if (message.includes('integration hub') || message.includes('sync engine')) {
      return { classification: 'integration', code: 'INTEGRATION_ERROR' };
    }
    if (
      message.includes('supabase') ||
      message.includes('postgres') ||
      message.includes('relation')
    ) {
      return { classification: 'database', code: 'DATABASE_ERROR' };
    }
    if (
      message.includes('fetch failed') ||
      message.includes('econnrefused') ||
      message.includes('timeout')
    ) {
      return { classification: 'external', code: 'EXTERNAL_SERVICE_ERROR' };
    }
  }
  return { classification: 'internal', code: 'INTERNAL_ERROR' };
}

export function classifyError(err: unknown, requestId?: string): ClassifiedError {
  const { classification, code } = classify(err);
  return {
    code,
    classification,
    severity: SEVERITY_BY_CLASSIFICATION[classification],
    retryable: RETRYABLE_BY_CLASSIFICATION[classification],
    userMessage: USER_MESSAGES[classification],
    requestId: requestId ?? generateCorrelationId(),
    timestamp: new Date().toISOString(),
  };
}

const SEVERITY_BY_CLASSIFICATION: Record<ErrorClassification, ErrorSeverity> = {
  validation: 'warning',
  auth: 'error',
  authorization: 'error',
  not_found: 'warning',
  database: 'error',
  external: 'error',
  workflow: 'error',
  ai: 'error',
  desktop: 'warning',
  integration: 'error',
  internal: 'fatal',
};

const RETRYABLE_BY_CLASSIFICATION: Record<ErrorClassification, boolean> = {
  validation: false,
  auth: false,
  authorization: false,
  not_found: false,
  database: true,
  external: true,
  workflow: true,
  ai: true,
  desktop: true,
  integration: true,
  internal: false,
};

const STATUS_BY_CLASSIFICATION: Record<ErrorClassification, number> = {
  validation: 400,
  auth: 401,
  authorization: 403,
  not_found: 404,
  database: 503,
  external: 502,
  workflow: 500,
  ai: 502,
  desktop: 503,
  integration: 502,
  internal: 500,
};

/** Wraps a Next.js route handler: classifies thrown errors, records them in the central registry, logs with requestId, returns a uniform JSON error shape. */
export function withErrorBoundary<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    const requestId = generateCorrelationId();
    try {
      return await handler(...args);
    } catch (err) {
      const classified = classifyError(err, requestId);
      const errorMessage = err instanceof Error ? err.message : String(err);

      getErrorRegistry().record(classified.classification, errorMessage);
      log.error('Unhandled route error', {
        requestId,
        classification: classified.classification,
        code: classified.code,
        error: errorMessage,
      });
      return NextResponse.json(
        {
          error: classified.userMessage,
          code: classified.code,
          severity: classified.severity,
          retryable: classified.retryable,
          requestId: classified.requestId,
        },
        { status: STATUS_BY_CLASSIFICATION[classified.classification] },
      );
    }
  };
}
