import { Eye, Clipboard, FileText, Monitor, Cpu, ScanText } from 'lucide-react';
import type { DesktopIntelligenceContext } from '@/lib/desktop-vision/types';
import { WidgetShell } from './widget-shell';

const CONTENT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  image: 'Görsel',
  screenshot: 'Ekran Görüntüsü',
  webpage: 'Web',
  code: 'Kod',
  terminal: 'Terminal',
  spreadsheet: 'Excel',
  document: 'Word',
  presentation: 'Sunum',
  plaintext: 'Metin',
  markdown: 'Markdown',
  csv: 'CSV',
  json: 'JSON',
  xml: 'XML',
  unknown: 'Bilinmeyen',
};

const CLIP_LABELS: Record<string, string> = {
  text: 'Metin',
  code: 'Kod',
  link: 'Link',
  filepath: 'Dosya Yolu',
  empty: 'Boş',
};

export interface DesktopVisionWidgetProps {
  context: DesktopIntelligenceContext;
}

export function DesktopVisionWidget({ context }: DesktopVisionWidgetProps) {
  const { window, health, recentOcr, recentClipboard, recentFiles, activeProject } = context;

  return (
    <WidgetShell
      title="Desktop Intelligence"
      icon={<Eye className="h-4 w-4" />}
      action={
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${health.cpuFriendly ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}
        >
          {health.triggerMode === 'on-change' ? 'Değişimde' : 'İstekle'}
        </span>
      }
    >
      {/* Vision Health + OCR Queue */}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{health.ocrProcessedTotal}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">OCR</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${health.ocrQueueLength > 0 ? 'text-orange-400' : 'text-foreground'}`}
          >
            {health.ocrQueueLength}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Kuyruk</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{health.clipboardEntries}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Clipboard</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{health.fileInsightsTotal}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Dosya</p>
        </div>
      </div>

      {/* OCR durumu + ortalama süre */}
      <div className="mb-2 flex items-center gap-1 text-[10px]">
        <Cpu className="text-muted-foreground h-3 w-3" />
        <span className="text-muted-foreground">OCR sağlayıcı:</span>
        <span className="text-foreground font-medium">{health.ocrProvider}</span>
        {health.averageOcrMs > 0 && (
          <span className="text-muted-foreground">· {health.averageOcrMs}ms ort.</span>
        )}
      </div>

      {/* Aktif pencere + proje */}
      {window ? (
        <div className="bg-muted/40 mb-2 rounded px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px]">
            <Monitor className="text-primary h-3 w-3" />
            <span className="text-foreground font-medium">{window.activeApp}</span>
            {activeProject && <span className="text-muted-foreground">· {activeProject}</span>}
          </div>
          {window.ide && (
            <p className="text-muted-foreground mt-0.5 text-[9px]">
              {window.ide.ideName}
              {window.ide.activeFile ? ` · ${window.ide.activeFile}` : ''}
              {window.ide.language ? ` · ${window.ide.language}` : ''}
              {window.ide.gitBranch ? ` · ${window.ide.gitBranch}` : ''}
              {window.ide.errorCount ? ` · ${window.ide.errorCount} hata` : ''}
            </p>
          )}
          {window.browser?.domain && (
            <p className="text-muted-foreground mt-0.5 text-[9px]">
              {window.browser.browserName} · {window.browser.domain} ({window.browser.workContext})
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground mb-2 text-[10px]">Aktif pencere bağlamı yok</p>
      )}

      {/* Son analiz */}
      {recentOcr.length > 0 && (
        <div className="mb-1.5">
          <div className="flex items-center gap-1 text-[10px]">
            <ScanText className="text-muted-foreground h-2.5 w-2.5" />
            <span className="text-muted-foreground">Son OCR:</span>
            <span className="text-foreground">
              {CONTENT_LABELS[recentOcr[0]!.contentKind] ?? recentOcr[0]!.contentKind}
            </span>
            <span className="text-muted-foreground">({recentOcr[0]!.wordCount} kelime)</span>
          </div>
        </div>
      )}

      {/* Clipboard */}
      {recentClipboard.length > 0 && (
        <div className="space-y-0.5">
          {recentClipboard.slice(0, 3).map((c, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px]">
              <Clipboard className="text-muted-foreground h-2.5 w-2.5 shrink-0" />
              <span className="text-primary shrink-0">{CLIP_LABELS[c.kind] ?? c.kind}</span>
              <span className="text-muted-foreground truncate">{c.preview}</span>
            </div>
          ))}
        </div>
      )}

      {/* Açık dosyalar */}
      {recentFiles.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {recentFiles.slice(0, 2).map((f, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px]">
              <FileText className="text-muted-foreground h-2.5 w-2.5 shrink-0" />
              <span className="text-foreground truncate">{f.fileName}</span>
              <span className="text-muted-foreground shrink-0">({f.fileType})</span>
            </div>
          ))}
        </div>
      )}

      {recentOcr.length === 0 &&
        recentClipboard.length === 0 &&
        recentFiles.length === 0 &&
        !window && (
          <p className="text-muted-foreground py-3 text-center text-[10px]">
            Desktop Agent vision verisi göndermeli (ekran/clipboard/dosya)
          </p>
        )}
    </WidgetShell>
  );
}
