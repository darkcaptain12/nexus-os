# Voice AI v1.0 — Gerçek "Hey APEX" (Sprint 17)

APEX'i doğal konuşulan, sürekli çalışan sesli asistana dönüştürür. Mevcut intent
katmanını (`quant/services/voice-service.ts` parseVoiceIntent/handleVoiceIntent)
**REUSE eder**, yeniden yazmaz — üstüne wake word + STT + TTS + session + memory sarar.

## Mimari Kararı: Pluggable Provider + İstemci DSP

Ham audio DSP (wake word), STT, TTS **istemci-tarafı** (browser Web Audio /
speechSynthesis, Porcupine, Whisper, Apple/Android Speech) veya kayıtlı
provider'da yapılır. Server: orkestrasyon, NLU (mevcut intent), güven skoru,
false-positive azaltma, session state, memory. Mobil/Watch aynı server sözleşmesini kullanır.

## Modüller

| Dosya                          | Görev                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `types.ts`                     | Session state, wake/STT/TTS, conversation, settings, status                                                  |
| `wake-word.ts`                 | "Hey APEX" fuzzy (Levenshtein) + false-positive azaltma (cooldown, cümle-içi filtre) + confidence; pluggable |
| `stt-registry.ts`              | STT provider registry (Whisper/Apple/Android/Deepgram/Azure/Google slotları), client-native default          |
| `tts-registry.ts`              | TTS provider registry (Apple/Android/ElevenLabs/Azure/OpenAI), TR/EN + erkek/kadın ses                       |
| `voice-session.ts`             | State machine (sleeping/listening/thinking/speaking/idle) + follow-up penceresi + interrupt + ring buffer    |
| `conversation-engine.ts`       | Tur işleme: STT → **mevcut intent katmanı** → TTS + memory; wake olmadan follow-up                           |
| `voice-memory.ts`              | Konuşmalar MemoryStore (source: 'voice') + önemli kararlar Knowledge Graph                                   |
| `services/voice-ai-service.ts` | Mobil-hazır facade (düz JSON)                                                                                |

## Konuşma Akışı

```
"Hey APEX"     → wake word (confidence ≥ eşik, cooldown) → "Evet Emir?"
"Bugün ne var?" → follow-up (wake gerekmez) → Executive/Agent → TTS cevap
"Trading nasıl?" → follow-up → Quant servisi → cevap
"dur"          → interrupt: speaking → idle
30s sessizlik  → follow-up timeout → sleeping (düşük CPU)
```

## Entegrasyon (reuse, paralel sistem yok)

- Intent: mevcut `parseVoiceIntent`/`handleVoiceIntent` (Agent Runtime, Action Engine, Executive, Quant, Desktop, Knowledge)
- Memory: `getMemoryStore().addTimelineEntry` (source: 'voice')
- Knowledge Graph: önemli intent'ler `ingestText` + `link` (auto-linker)
- Approval: riskli komutlar (BTC al) handleVoiceIntent'te requiresApproval → Approval Queue

## API (8 uç `/api/voice`)

`` (POST tur), start, stop, status, providers, conversation (GET+interrupt), history, settings (GET+PATCH)

## Performans

Wake word event-driven (istemci audio besler, server poll yok). Session ring buffer (100 tur/50 arşiv). Follow-up lazy timeout (status çağrısında kontrol). Memory leak yok — bounded buffer'lar.

## Yeni Provider Ekleme

```ts
import { registerSttProvider } from './stt-registry';
registerSttProvider(whisperProvider, true); // setActive
```
