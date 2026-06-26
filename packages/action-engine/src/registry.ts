import type { ActionDefinition, ActionHandler } from './types';

interface RegisteredAction {
  definition: ActionDefinition;
  handler: ActionHandler;
}

export class ActionRegistry {
  private actions = new Map<string, RegisteredAction>();

  register(definition: ActionDefinition, handler: ActionHandler): void {
    this.actions.set(definition.id, { definition, handler });
  }

  unregister(actionId: string): void {
    this.actions.delete(actionId);
  }

  get(actionId: string): RegisteredAction | undefined {
    return this.actions.get(actionId);
  }

  getDefinition(actionId: string): ActionDefinition | undefined {
    return this.actions.get(actionId)?.definition;
  }

  getHandler(actionId: string): ActionHandler | undefined {
    return this.actions.get(actionId)?.handler;
  }

  list(category?: string): ActionDefinition[] {
    const all = [...this.actions.values()].map((a) => a.definition);
    return category ? all.filter((a) => a.category === category) : all;
  }

  has(actionId: string): boolean {
    return this.actions.has(actionId);
  }

  count(): number {
    return this.actions.size;
  }
}
