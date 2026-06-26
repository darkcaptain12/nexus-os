# @apex-os/logger

Structured logging with Pino. Supports debug, info, warn, error, and audit levels.

## Usage

```typescript
import { createLogger } from '@apex-os/logger';

const log = createLogger({ service: 'web', module: 'auth' });
log.info('User logged in', { userId: '123' });
log.audit('Permission changed', { role: 'admin' });
```

## Exports

- `createLogger()` — Create a logger instance
- `Logger` — Logger interface
- `LogLevel`, `LogContext` — Types
