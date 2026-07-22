# Desktop Intelligence v1.0 — Vision + OCR + Clipboard (Sprint 16)

APEX OS'yi ekrana bakıp yorum yapabilen masaüstü asistanına dönüştürür. Tüm yeni
bilgi mevcut Memory Engine + Knowledge Graph'a bağlanır; paralel sistem YOK.

## Mimari Kararı: Pluggable Provider

Ham pixel→text (OCR) ve binary→text (dosya) çıkarımı **istemci-tarafı** yapılır
(macOS Vision framework, mobil ML Kit) veya kayıtlı provider'a yönlendirilir —
exchange-registry pattern'i (Sprint 14). Bu servis katmanı GERÇEK işi yapar:
dil algılama (TR/EN), içerik sınıflandırma, entity çıkarımı, dedup, kuyruk,
Knowledge Graph yazımı. Mobil ML Kit aynı servisleri besler.

## Modüller

| Dosya                                | Görev                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                           | Tüm vision tipleri (OCR, screen, clipboard, file, IDE, browser, health, context)                                           |
| `content-classifier.ts`              | TR/EN dil algılama + içerik tipi (PDF/kod/terminal/Excel/Word/JSON/XML…) + yapılandırılmış öğe çıkarımı — saf fonksiyonlar |
| `ocr-service.ts`                     | Pluggable OCR provider registry + değişim-tetikli kuyruk (hash dedup → CPU dostu)                                          |
| `screen-capture-service.ts`          | Screen Understanding: app→dosya→katman→proje→görev→müşteri zinciri                                                         |
| `ui-analysis-service.ts`             | OCR metninden UI öğesi sınıflandırma (buton/hata/başlık/alan)                                                              |
| `clipboard-service.ts`               | İçerik tipi (metin/kod/link/dosya-yolu) + dedup + Memory entegrasyonu                                                      |
| `file-insight-service.ts`            | Dosya entity çıkarımı (mevcut entity-extractor) → KG → Memory → Executive                                                  |
| `ide-insight.ts`                     | VS Code/Cursor/Claude Code/Terminal: proje/dosya/dil/branch/hata/build                                                     |
| `browser-insight.ts`                 | Chrome/Edge/Safari/Brave: aktif sekme/domain/başlık/çalışma bağlamı (geçmiş YOK)                                           |
| `window-context-service.ts`          | IDE+browser+screen birleşimi → aktif proje                                                                                 |
| `vision-health.ts`                   | OCR/clipboard/file durum özeti, triggerMode on-change                                                                      |
| `services/desktop-vision-service.ts` | Mobil-hazır servis katmanı (düz JSON), Context Builder v3 girdisi                                                          |
| `services/voice-bridge.ts`           | Voice: "ekranda ne görüyorsun / PDF özetle / hata neden / Excel analiz"                                                    |

## Entegrasyon (mevcut sisteme hook)

- Memory: her OCR/clipboard/dosya/ekran → `getMemoryStore().addTimelineEntry` (source: 'desktop')
- Knowledge Graph: `auto-linker.recordScreenContext/recordExtractedContent/recordClipboard`
- Context Builder v3: `OrchestratorContext.desktop` — Executive artık ekran bağlamını da alır
- Voice: 4 yeni intent → `voice-bridge`

## Performans

OCR SÜREKLİ çalışmaz. `runOcr` hash dedup ile aynı ekranı atlar (force=false);
yalnız değişimde veya istekte (force=true) işler. Kuyruk manuel `drainOcrQueue`
ile boşalır — poll YOK. CPU dostu.

## Yeni OCR Provider Ekleme

```ts
import { registerOcrProvider } from './ocr-service';
registerOcrProvider(myTesseractProvider, true); // setActive=true
```
