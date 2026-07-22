# Quant Services — Mobil + Voice Hazırlık Katmanı

## quant-service.ts

Mobil-hazır servis sözleşmesi: yalnızca düz JSON-serileştirilebilir veri döner;
UI/cookie/framework tipi sızmaz. Web API route'ları, ileride iPhone/Android/iPad/
Apple Watch/Wear OS istemcileri aynı fonksiyonları kullanır.
`getTradingStatusSummary()` watch-complication boyutunda kompakt özet verir.

## voice-service.ts

APEX Voice altyapısı (Sprint 14 hazırlık — ses motoru DEĞİL):
istemci STT metnini gönderir → `parseVoiceIntent` kural tabanlı intent çıkarır →
`handleVoiceIntent` mevcut Agent Runtime / Quant servislerini çağırır →
konuşulabilir `speech` + yapılandırılmış `data` döner.
Aksiyon gerektiren intent'ler Agent Runtime'dan geçer; onay mimarisi otomatik korunur.
Wake-word ("Hey APEX"), STT/TTS ileride mobil istemcide çalışacak.
