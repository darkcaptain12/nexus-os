# APEX OS — Kurulum Kılavuzu

Yeni bir bilgisayarda APEX OS v1.0 kurulumu.

## Ön Gereksinimler

- **Node.js 20+**
- **pnpm** (monorepo — `npm i -g pnpm`)
- **Supabase hesabı** (kalıcılık için; olmadan mock modda çalışır)

## 1. Klonla + Bağımlılıklar

```bash
git clone <repo-url> apex-os
cd apex-os
pnpm install
```

## 2. Environment (.env.local)

`.env.example` → `.env.local` kopyala, doldur:

```bash
cp .env.example apps/web/.env.local
```

### Supabase {#supabase}

1. [supabase.com](https://supabase.com) → yeni proje
2. Settings → API → URL + anon key → `.env.local`
3. Migration'ları çalıştır:

```bash
pnpm supabase db push   # veya supabase/migrations/ SQL'lerini sırayla
```

### AI {#ai}

`ANTHROPIC_API_KEY` (veya `OPENAI_API_KEY`) — Executive/Agent/Voice için.

## 3. Çalıştır

```bash
pnpm dev:web     # http://localhost:3000
```

İlk açılışta dashboard'daki **Release/Installation** paneli eksik yapılandırmaları gösterir. `/api/system/install` kurulum adım durumunu döner.

## 4. Doğrulama

```bash
pnpm type-check && pnpm lint && pnpm build && pnpm test
```

`/api/system/environment` → env kontrolü, `/api/system/release` → production score.

## Kurulum Adımları (Installation Wizard)

| Adım               | Zorunlu | Açıklama                                 |
| ------------------ | ------- | ---------------------------------------- |
| Supabase           | ✅      | Kalıcılık + auth + cloud sync            |
| AI API Key         | —       | Executive/Agent/Voice (canlı)            |
| Trading (OKX)      | —       | Market data + paper trading              |
| Commerce (Shopify) | —       | Ürün/sipariş                             |
| Notification       | —       | Telegram/Discord alert                   |
| Voice              | —       | STT/TTS (istemci ML Kit alternatifi var) |
| Desktop Agent      | —       | Ekran/OCR                                |
| Cloud Sync         | —       | Supabase üstünde otomatik                |

Yalnız Supabase ile temel kullanım (dashboard/memory/executive/knowledge graph) çalışır. Canlı gelir üretimi için ilgili API key'ler eklenir.

## Sorun Giderme

- Supabase yoksa: mock mode (veriler kalıcı değil) — uyarı normaldir.
- Turkey bölge bloğu: Binance/MEXC SSL exit 35 → OKX default kullanılır.
- Detay: [CLAUDE.md](../CLAUDE.md) mimari kuralları.
