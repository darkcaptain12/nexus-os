import pino from 'pino';
import type { Logger, LogContext } from './types';

export function createLogger(context: LogContext): Logger {
  const base = pino({
    name: context.service,
    level: process.env.LOG_LEVEL ?? 'info',
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }).child({
    module: context.module,
    userId: context.userId,
    requestId: context.requestId,
  });

  return {
    debug: (message, ctx) => base.debug(ctx, message),
    info: (message, ctx) => base.info(ctx, message),
    warn: (message, ctx) => base.warn(ctx, message),
    error: (message, ctx) => base.error(ctx, message),
    audit: (message, ctx) => base.info({ ...ctx, audit: true }, message),
    child: (bindings) => {
      return createLogger({ ...context, ...bindings } as LogContext);
    },
  };
}
