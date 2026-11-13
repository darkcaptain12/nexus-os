import type { VisionHealth } from './types';
import { getOcrStats } from './ocr-service';
import { getClipboardStats } from './clipboard-service';
import { getFileInsightCount } from './file-insight-service';

// Vision Health — OCR/clipboard/file servislerinin durum özeti.
// triggerMode 'on-change': OCR sürekli çalışmaz, CPU dostu.

const g = globalThis as unknown as { __apexVisionLastAnalysis?: string | null };

export function markAnalysis(): void {
  g.__apexVisionLastAnalysis = new Date().toISOString();
}

export function getVisionHealth(): VisionHealth {
  const ocr = getOcrStats();
  const clipboard = getClipboardStats();

  return {
    ocrProvider: ocr.activeProvider,
    ocrProvidersAvailable: ocr.providersAvailable,
    ocrQueueLength: ocr.queueLength,
    ocrProcessedTotal: ocr.processedTotal,
    ocrFailedTotal: ocr.failedTotal,
    averageOcrMs: ocr.averageMs,
    clipboardEntries: clipboard.total,
    fileInsightsTotal: getFileInsightCount(),
    lastAnalysisAt: g.__apexVisionLastAnalysis ?? null,
    triggerMode: 'on-change',
    cpuFriendly: true,
    generatedAt: new Date().toISOString(),
  };
}
