import { ActionEngine } from '@apex-os/action-engine';

let instance: ActionEngine | null = null;

export function getActionEngine(): ActionEngine {
  if (!instance) {
    instance = new ActionEngine(5);
  }
  return instance;
}
