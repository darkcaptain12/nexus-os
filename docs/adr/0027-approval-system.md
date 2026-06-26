# ADR-0027: Risk-Based Approval System

## Status
Accepted

## Context
An AI OS that can execute actions must never perform dangerous operations without user consent. The approval system must balance automation convenience with safety.

## Decision
Four risk levels with configurable auto-approval. AI-sourced requests for HIGH/CRITICAL actions always require human approval regardless of configuration.

## Risk Levels
- **LOW**: Auto-approved (notifications, reads, non-destructive)
- **MEDIUM**: Configurable — default requires approval
- **HIGH**: Always requires approval (writes, external API calls)
- **CRITICAL**: Always requires explicit confirmation (financial, destructive, irreversible)

## AI Constraint
When `source === 'ai'` and `riskLevel in ['high', 'critical']`, approval is mandatory. No policy override. This is a hard safety boundary.
