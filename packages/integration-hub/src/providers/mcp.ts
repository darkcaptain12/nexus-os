import { BaseProvider } from '../provider';
import type { ProviderMetadata, ProviderAction, ExecuteResult, ProviderCredentials } from '../types';

export class MCPProvider extends BaseProvider {
  readonly metadata: ProviderMetadata = {
    id: 'mcp',
    name: 'MCP Server',
    description: 'Model Context Protocol server integration',
    category: 'mcp',
    authMethod: 'none',
    capabilities: ['discover', 'execute'],
    version: '1.0.0',
  };

  private serverUrl = '';
  private discoveredTools: ProviderAction[] = [];

  async connect(credentials: ProviderCredentials): Promise<void> {
    await super.connect(credentials);
    this.serverUrl = credentials.metadata?.['serverUrl'] as string ?? 'http://localhost:3100';
  }

  getActions(): ProviderAction[] {
    return [
      {
        id: 'mcp.discover', providerId: 'mcp', name: 'Discover Tools',
        description: 'List available MCP tools', method: 'GET', riskLevel: 'low', parameters: [],
      },
      {
        id: 'mcp.execute', providerId: 'mcp', name: 'Execute Tool',
        description: 'Execute an MCP tool', method: 'POST', riskLevel: 'medium',
        parameters: [
          { name: 'tool', type: 'string', required: true, description: 'Tool name' },
          { name: 'args', type: 'object', required: false, description: 'Tool arguments' },
        ],
      },
      ...this.discoveredTools,
    ];
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecuteResult> {
    const start = performance.now();

    try {
      switch (action) {
        case 'mcp.discover': {
          const res = await fetch(`${this.serverUrl}/tools`, { signal: AbortSignal.timeout(5000) });
          const tools = await res.json();
          this.discoveredTools = (tools as { name: string; description: string }[]).map((t) => ({
            id: `mcp.tool.${t.name}`,
            providerId: 'mcp',
            name: t.name,
            description: t.description,
            method: 'POST',
            riskLevel: 'medium' as const,
            parameters: [],
          }));
          return this.makeResult(action, start, { tools: this.discoveredTools.length });
        }
        case 'mcp.execute': {
          const res = await fetch(`${this.serverUrl}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: params.tool, arguments: params.args ?? {} }),
            signal: AbortSignal.timeout(30000),
          });
          return this.makeResult(action, start, await res.json());
        }
        default:
          return this.makeError(action, start, `Unknown action: ${action}`);
      }
    } catch (err) {
      return this.makeError(action, start, err instanceof Error ? err.message : String(err));
    }
  }
}
