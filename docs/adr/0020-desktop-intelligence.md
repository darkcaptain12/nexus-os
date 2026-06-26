# ADR-0020: Desktop Intelligence — Observation Layer

## Status

Accepted

## Context

An AI operating system must understand what the user is doing on their computer. Without desktop awareness, the AI cannot make contextual recommendations or track productivity. This must be done with strict privacy boundaries — observation only, never automation.

## Decision

Build a standalone desktop agent (`apps/desktop-agent`) that collects metadata about active applications, window titles, system resources, and produces activity timelines and productivity scores. The agent runs as a background Node.js process with an HTTP API. The web app connects to it optionally.

## Privacy Boundaries

- Metadata only — no screenshots, keystrokes, clipboard, or file contents
- Opt-in — agent must be explicitly started
- No persistent storage — data lives in memory for the current session
- Browser: tab titles and domains only, never page content
- IDE: workspace name, language, git branch — never file contents

## Architecture

- **Collectors**: Window, system, browser, IDE — each reads specific metadata
- **Activity Timeline**: Records app switches with timestamps and durations
- **Productivity Engine**: Calculates focus sessions, context switches, and a 0-100 score
- **HTTP API**: 4 endpoints + health check, consumed by web dashboard
- **Dashboard Widget**: Client component that polls agent status

## Scoring Algorithm

Score (0-100) = focus_ratio × 50 + focus_bonus (max 20) - switch_penalty (max 30) - idle_penalty (max 20) + base (30)

Higher score means: more focused work, fewer context switches, less idle time, longer uninterrupted sessions.

## Consequences

- Agent must be started separately (`pnpm --filter @apex-os/desktop-agent dev`)
- Web dashboard degrades gracefully when agent is not connected
- Cross-platform support requires platform-specific active-window detection
- Memory usage grows with timeline length — needs periodic cleanup for long sessions
