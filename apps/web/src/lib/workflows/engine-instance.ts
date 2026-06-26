import { WorkflowRuntime, WorkflowScheduler, WORKFLOW_TEMPLATES } from '@apex-os/workflow-engine';
import type { Workflow } from '@apex-os/workflow-engine';

let instance: WorkflowRuntime | null = null;
let scheduler: WorkflowScheduler | null = null;

export function getWorkflowRuntime(): WorkflowRuntime {
  if (!instance) {
    instance = new WorkflowRuntime();
    instance.registerHandler('notify.push', { execute: async (config) => ({ notified: true, ...config }) });
    instance.registerHandler('notify.desktop', { execute: async (config) => ({ notified: true, ...config }) });
    instance.registerHandler('ai.briefing', { execute: async () => ({ briefing: 'generated' }) });
    instance.registerHandler('memory.journal', { execute: async () => ({ journal: 'generated' }) });
    instance.registerHandler('memory.save', { execute: async () => ({ saved: true }) });
    instance.registerHandler('memory.weeklySummary', { execute: async () => ({ summary: 'generated' }) });

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
