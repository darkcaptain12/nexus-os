# NEXUS OS — Desktop Agent

Desktop intelligence layer — observes what the user is doing, tracks activity, calculates productivity. Metadata only, no automation.

## Start

```bash
pnpm --filter @apex-os/desktop-agent dev
```

Agent runs on `http://localhost:9120`.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/desktop/status` | Active window, system info, IDE/browser state, productivity |
| `GET /api/desktop/activity` | Activity timeline + recent entries |
| `GET /api/desktop/productivity` | Focus sessions, context switches, score |
| `GET /api/desktop/apps` | App usage ranked by duration |
| `GET /health` | Agent health check |

## Privacy

- No screenshots, keystrokes, or clipboard
- No file contents
- Browser: tab titles and domains only
- IDE: workspace name, language, git branch only
- All data in-memory, not persisted
- Opt-in — must be explicitly started

## Architecture

```
Collectors → Activity Timeline → Productivity Engine → HTTP API → Dashboard Widget
```
