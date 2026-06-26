# @apex-os/auth

Authentication and authorization with role-based access control (RBAC).

## Roles

- `owner` — Full system access
- `admin` — Everything except system management
- `member` — Read/write for assigned modules
- `viewer` — Read-only access
- `agent` — AI agent access (memory, automation, execution)

## Exports

- `ROLES`, `PERMISSIONS` — Constants
- `ROLE_PERMISSIONS` — Role-to-permission mapping
- `hasPermission()` — Permission check helper
