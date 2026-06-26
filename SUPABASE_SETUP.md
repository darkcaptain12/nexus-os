# NEXUS OS — Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create new project
3. Note your **Project URL** and **Anon Key** from Settings → API

## 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Set these values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Run Migrations

Option A — Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Option B — Manual via SQL Editor:

Run each migration file in order from `supabase/migrations/`:

1. `001_extensions_and_base.sql`
2. `002_identity.sql`
3. `003_ai_agents.sql`
4. `004_memory.sql`
5. `005_goals_tasks.sql`
6. `006_workflows.sql`
7. `007_notifications.sql`
8. `008_trading.sql`
9. `009_commerce.sql`
10. `010_finance_calendar_health.sql`
11. `011_desktop_browser.sql`
12. `012_automation_kernel.sql`
13. `013_audit_voice.sql`
14. `014_rls_policies.sql`
15. `015_functions_views.sql`

## 4. Verify

```bash
pnpm dev
```

Visit `http://localhost:3000/api/system/database`

Expected response:

```json
{
  "configured": true,
  "health": { "connected": true, "tablesFound": 8 }
}
```

## 5. Create First User

Visit `http://localhost:3000/kayit` and register.

## Troubleshooting

- **"Supabase not configured"** → Check `.env.local` has URL and key
- **"Tables not found"** → Run migrations (step 3)
- **Auth not working** → Enable Email provider in Supabase Dashboard → Authentication → Providers
