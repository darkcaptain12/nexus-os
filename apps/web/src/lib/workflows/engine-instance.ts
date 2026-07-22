import { WorkflowRuntime, WorkflowScheduler, WORKFLOW_TEMPLATES } from '@apex-os/workflow-engine';
import type { Workflow, ExecutionContext } from '@apex-os/workflow-engine';
import { getActionEngine } from '@/lib/actions/engine-instance';

let instance: WorkflowRuntime | null = null;
let scheduler: WorkflowScheduler | null = null;

function registerHandlers(runtime: WorkflowRuntime): void {
  runtime.registerHandler('notify.push', {
    async execute(config: Record<string, unknown>, ctx: ExecutionContext) {
      const engine = getActionEngine();
      const execution = await engine.submit({
        actionId: 'notification.send',
        params: {
          title: config['title'] ?? 'Bildirim',
          body: config['body'] ?? '',
          userId: ctx.variables['userId'],
        },
        requestedBy: 'workflow',
        source: 'automation',
        priority: 3,
      });
      await engine.processNext();
      return execution;
    },
  });

  runtime.registerHandler('notify.desktop', {
    async execute(config: Record<string, unknown>, ctx: ExecutionContext) {
      const engine = getActionEngine();
      const execution = await engine.submit({
        actionId: 'notification.send',
        params: {
          title: config['title'] ?? 'Desktop',
          body: config['body'] ?? '',
          userId: ctx.variables['userId'],
        },
        requestedBy: 'workflow',
        source: 'automation',
        priority: 3,
      });
      await engine.processNext();
      return execution;
    },
  });

  runtime.registerHandler('ai.briefing', {
    async execute() {
      const { generateDailyBriefing } = await import('@/lib/ai/executive');
      return generateDailyBriefing({
        userId: 'system',
        name: 'NEXUS',
        email: '',
        timezone: 'Europe/Istanbul',
        locale: 'tr-TR',
      });
    },
  });

  runtime.registerHandler('memory.journal', {
    async execute() {
      const { generateDailyJournal } = await import('@/lib/memory');
      return generateDailyJournal();
    },
  });

  runtime.registerHandler('memory.save', {
    async execute(config: Record<string, unknown>) {
      const engine = getActionEngine();
      await engine.submit({
        actionId: 'memory.save',
        params: { content: config['content'] ?? 'Auto-saved', type: config['type'] ?? 'knowledge' },
        requestedBy: 'workflow',
        source: 'automation',
        priority: 2,
      });
      await engine.processNext();
      return { saved: true };
    },
  });

  runtime.registerHandler('memory.weeklySummary', {
    async execute() {
      const { getWeeklyReviewData } = await import('@/lib/ai/executive');
      return getWeeklyReviewData();
    },
  });

  runtime.registerHandler('task.create', {
    async execute(config: Record<string, unknown>) {
      const engine = getActionEngine();
      const execution = await engine.submit({
        actionId: 'task.create',
        params: {
          title: config['title'],
          priority: config['priority'] ?? 'normal',
          userId: config['userId'],
        },
        requestedBy: 'workflow',
        source: 'automation',
        priority: 3,
      });
      await engine.processNext();
      return execution;
    },
  });

  runtime.registerHandler('task.complete', {
    async execute(config: Record<string, unknown>) {
      const engine = getActionEngine();
      const execution = await engine.submit({
        actionId: 'task.complete',
        params: { taskId: config['taskId'] },
        requestedBy: 'workflow',
        source: 'automation',
        priority: 3,
      });
      await engine.processNext();
      return execution;
    },
  });
}

export function getWorkflowRuntime(): WorkflowRuntime {
  if (!instance) {
    instance = new WorkflowRuntime();
    registerHandlers(instance);
    scheduler = new WorkflowScheduler(instance);
    scheduler.start(60000);
  }
  return instance;
}

export function getWorkflowScheduler(): WorkflowScheduler | null {
  return scheduler;
}

export function createWorkflowFromTemplate(templateId: string, userId: string): Workflow | null {
  const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  return {
    ...template.workflow,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
  };
}
