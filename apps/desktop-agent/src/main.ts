import { createLogger } from '@apex-os/logger';
import { DesktopAgent } from './services/desktop-agent';
import { createAgentServer } from './api/server';

const PORT = parseInt(process.env.AGENT_PORT ?? '9120', 10);
const log = createLogger({ service: 'desktop-agent', module: 'main' });

async function main() {
  log.info('NEXUS Desktop Agent starting...');

  const agent = new DesktopAgent({
    pollIntervalMs: 5000,
    idleThresholdSeconds: 300,
    focusThresholdSeconds: 120,
    enabled: true,
    collectBrowser: true,
    collectIDE: true,
  });

  agent.start();

  const server = createAgentServer(agent, PORT);
  server.listen(PORT, () => {
    log.info(`Desktop Agent API running on http://localhost:${PORT}`);
    log.info('Endpoints:');
    log.info('  GET /api/desktop/status');
    log.info('  GET /api/desktop/activity');
    log.info('  GET /api/desktop/productivity');
    log.info('  GET /api/desktop/apps');
    log.info('  GET /health');
  });

  const shutdown = () => {
    log.info('Shutting down Desktop Agent...');
    agent.stop();
    server.close(() => {
      log.info('Desktop Agent stopped.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  log.error('Desktop Agent failed to start', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
