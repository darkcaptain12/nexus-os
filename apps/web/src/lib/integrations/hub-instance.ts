import {
  IntegrationHub,
  SyncEngine,
  EventBridge,
  createDefaultMappings,
  GitHubProvider,
  GmailProvider,
  GoogleCalendarProvider,
  MCPProvider,
  HTTPProvider,
  NotionProvider,
  SlackProvider,
} from '@apex-os/integration-hub';

let hubInstance: IntegrationHub | null = null;
let syncInstance: SyncEngine | null = null;
let bridgeInstance: EventBridge | null = null;

export function getIntegrationHub(): IntegrationHub {
  if (!hubInstance) {
    hubInstance = new IntegrationHub();
    hubInstance.registerProvider(new GitHubProvider());
    hubInstance.registerProvider(new GmailProvider());
    hubInstance.registerProvider(new GoogleCalendarProvider());
    hubInstance.registerProvider(new MCPProvider());
    hubInstance.registerProvider(new HTTPProvider());
    hubInstance.registerProvider(new NotionProvider());
    hubInstance.registerProvider(new SlackProvider());
  }
  return hubInstance;
}

export function getSyncEngine(): SyncEngine {
  if (!syncInstance) {
    syncInstance = new SyncEngine();
  }
  return syncInstance;
}

export function getEventBridge(): EventBridge {
  if (!bridgeInstance) {
    bridgeInstance = new EventBridge();
    for (const mapping of createDefaultMappings()) {
      bridgeInstance.registerMapping(mapping);
    }
  }
  return bridgeInstance;
}
