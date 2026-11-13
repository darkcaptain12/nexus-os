# APEX OS — Migration Kılavuzu

## Veritabanı Migration'ları

Migration'lar `supabase/migrations/` altında sıralı SQL dosyalarıdır.
**Güncel migration version: 19** (`019_memory_entities.sql`).

### Yeni Kurulum

```bash
pnpm supabase db push
```

veya `supabase/migrations/*.sql` dosyalarını numara sırasıyla çalıştır.

### Güncelleme (mevcut kurulum)

```bash
git pull
pnpm install
pnpm supabase db push   # yeni migration'lar uygulanır
pnpm build
```

Migration version'ı `/api/system/version` ile kontrol et.

## Veri Taşıma (Backup / Export)

Tam veri paketi export/import — makineler arası taşıma:

```bash
# Export (dashboard veya API)
GET /api/system/release  → releaseDashboard

# Programatik export (Memory/KG/Commerce/Trading/Workflow/Plugins/Settings)
# lib/release/backup-export.ts → exportPackage()
```

Export paketi checksum ile doğrulanır (`verifyPackage`). Bozuk/değiştirilmiş paket import edilmez.

## Sürüm Atlama

- v0.x → v1.0.0: tüm migration'lar (001-019) uygulanmalı.
- Migration'lar geri alınamaz (soft delete `deleted_at` kullanılır, hard delete yok).

## Rollback

- Kod: `git checkout <tag>`
- Veri: soft-delete sayesinde `deleted_at` null'lanarak kurtarılabilir.
- Cloud backup: `lib/cloud/cloud-backup.ts` version history + restore plan.
