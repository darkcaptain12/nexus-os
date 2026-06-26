import { IntegrationHub, GitHubProvider, GmailProvider, GoogleCalendarProvider, MCPProvider, HTTPProvider } from '@apex-os/integration-hub';

let instance: IntegrationHub | null = null;

export function getIntegrationHub(): IntegrationHub {
  if (!instance) {
    instance = new IntegrationHub();
    instance.registerProvider(new GitHubProvider());
    instance.registerProvider(new GmailProvider());
    instance.registerProvider(new GoogleCalendarProvider());
    instance.registerProvider(new MCPProvider());
    instance.registerProvider(new HTTPProvider());
  }
  return instance;
}
