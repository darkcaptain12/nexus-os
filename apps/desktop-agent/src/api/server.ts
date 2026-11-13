import http from 'http';
import type { DesktopAgent } from '../services/desktop-agent';

export function createAgentServer(agent: DesktopAgent, port = 9120): http.Server {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      const path = url.pathname;

      if (path === '/api/desktop/status') {
        const status = await agent.getStatus();
        respond(res, 200, status);
      } else if (path === '/api/desktop/activity') {
        const timeline = agent.getTimeline();
        const recent = agent.getRecentActivity(20);
        respond(res, 200, { timeline, recent });
      } else if (path === '/api/desktop/productivity') {
        const productivity = agent.getProductivity();
        respond(res, 200, productivity);
      } else if (path === '/api/desktop/apps') {
        const apps = agent.getAppUsage();
        respond(res, 200, { apps, count: apps.length });
      } else if (path === '/api/desktop/focus') {
        const focus = agent.getFocusData();
        respond(res, 200, focus);
      } else if (path === '/api/desktop/browser') {
        const status = await agent.getStatus();
        respond(res, 200, { browser: status.browserState });
      } else if (path === '/api/desktop/timeline') {
        const timeline = agent.getTimeline();
        respond(res, 200, timeline);
      } else if (path === '/api/desktop/timeline/history') {
        respond(res, 200, { days: agent.getDailySummaries() });
      } else if (path === '/api/desktop/privacy') {
        respond(res, 200, agent.getPrivacyConfig());
      } else if (path === '/health') {
        respond(res, 200, {
          status: 'ok',
          uptime: process.uptime(),
          sync: agent.getSyncStats(),
          timelineMemory: agent.getTimelineMemoryStats(),
          process: agent.getProcessMetrics(),
        });
      } else {
        respond(res, 404, { error: 'Not found' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      respond(res, 500, { error: message });
    }
  });

  return server;
}

function respond(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status);
  res.end(JSON.stringify(data));
}
