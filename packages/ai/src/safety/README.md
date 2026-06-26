# Safety

Permission enforcement, dangerous action detection, human approval workflows, policy management, audit logging, and rate limiting.

## Components

- **SafetyGuard** — Pre-execution safety checks against policies
- **PolicyManager** — Define and manage safety rules
- **ApprovalManager** — Human-in-the-loop approval for risky actions
- **AuditLogger** — Immutable record of all AI actions
- **RateLimiter** — Request and token rate limiting
- **DangerousActionDetector** — Classify and restrict dangerous operations

## Risk Levels

- **none** — No risk, auto-approved
- **low** — Logged, auto-approved
- **medium** — Logged, may require approval
- **high** — Requires human approval
- **critical** — Denied by default, requires override
