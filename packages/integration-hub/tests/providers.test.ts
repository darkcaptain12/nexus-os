import { describe, it, expect } from 'vitest';
import { GitHubProvider } from '../src/providers/github';
import { GmailProvider } from '../src/providers/gmail';
import { GoogleCalendarProvider } from '../src/providers/calendar';
import { MCPProvider } from '../src/providers/mcp';
import { HTTPProvider } from '../src/providers/http';

describe('GitHubProvider', () => {
  const provider = new GitHubProvider();

  it('has correct metadata', () => {
    expect(provider.metadata.id).toBe('github');
    expect(provider.metadata.category).toBe('code');
  });

  it('has 5 actions', () => {
    expect(provider.getActions()).toHaveLength(5);
  });

  it('starts disconnected', () => {
    expect(provider.isConnected()).toBe(false);
  });

  it('fails execute without auth', async () => {
    const result = await provider.execute('github.listRepos', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Not authenticated');
  });

  it('returns error for unknown action', async () => {
    await provider.connect({ providerId: 'github', authMethod: 'bearer', accessToken: 'fake' });
    const result = await provider.execute('github.unknown', {});
    expect(result.success).toBe(false);
  });
});

describe('GmailProvider', () => {
  const provider = new GmailProvider();

  it('has correct metadata', () => {
    expect(provider.metadata.id).toBe('gmail');
    expect(provider.metadata.category).toBe('email');
    expect(provider.metadata.authMethod).toBe('oauth2');
  });

  it('has 3 actions', () => {
    expect(provider.getActions()).toHaveLength(3);
  });

  it('send action is high risk', () => {
    const sendAction = provider.getActions().find((a) => a.id === 'gmail.send');
    expect(sendAction?.riskLevel).toBe('high');
  });
});

describe('GoogleCalendarProvider', () => {
  const provider = new GoogleCalendarProvider();

  it('has correct metadata', () => {
    expect(provider.metadata.id).toBe('google-calendar');
    expect(provider.metadata.category).toBe('calendar');
  });

  it('has 3 actions', () => {
    expect(provider.getActions()).toHaveLength(3);
  });

  it('delete action is high risk', () => {
    const deleteAction = provider.getActions().find((a) => a.id === 'calendar.deleteEvent');
    expect(deleteAction?.riskLevel).toBe('high');
  });
});

describe('MCPProvider', () => {
  const provider = new MCPProvider();

  it('has correct metadata', () => {
    expect(provider.metadata.id).toBe('mcp');
    expect(provider.metadata.category).toBe('mcp');
  });

  it('has discover and execute actions', () => {
    const actions = provider.getActions();
    expect(actions.find((a) => a.id === 'mcp.discover')).toBeDefined();
    expect(actions.find((a) => a.id === 'mcp.execute')).toBeDefined();
  });
});

describe('HTTPProvider', () => {
  const provider = new HTTPProvider();

  it('has correct metadata', () => {
    expect(provider.metadata.id).toBe('http');
    expect(provider.metadata.category).toBe('http');
  });

  it('has 4 actions (GET, POST, PUT, DELETE)', () => {
    expect(provider.getActions()).toHaveLength(4);
  });

  it('GET is low risk, POST is medium', () => {
    const actions = provider.getActions();
    expect(actions.find((a) => a.id === 'http.get')?.riskLevel).toBe('low');
    expect(actions.find((a) => a.id === 'http.post')?.riskLevel).toBe('medium');
  });

  it('fails without URL', async () => {
    await provider.connect({ providerId: 'http', authMethod: 'none' });
    const result = await provider.execute('http.get', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('URL required');
  });
});
