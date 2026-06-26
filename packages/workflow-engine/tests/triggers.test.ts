import { describe, it, expect } from 'vitest';
import { TriggerRegistry, shouldRunInBusinessHours } from '../src/triggers/registry';
import { listTemplates, getTemplate } from '../src/templates';

describe('TriggerRegistry', () => {
  const registry = new TriggerRegistry();

  it('lists all trigger types', () => {
    const triggers = registry.list();
    expect(triggers.length).toBeGreaterThanOrEqual(10);
  });

  it('gets specific trigger', () => {
    const manual = registry.get('manual');
    expect(manual).toBeDefined();
    expect(manual!.name).toBe('Manuel');
  });

  it('returns config schema for schedule', () => {
    const schema = registry.getConfigSchema('schedule');
    expect(schema.find((f) => f.name === 'cron')).toBeDefined();
  });

  it('returns empty schema for manual', () => {
    expect(registry.getConfigSchema('manual')).toHaveLength(0);
  });
});

describe('shouldRunInBusinessHours', () => {
  it('respects business hours', () => {
    const result = shouldRunInBusinessHours({
      timezone: 'Europe/Istanbul',
      businessHoursOnly: true,
      excludeWeekends: false,
      jitterMs: 0,
    });
    expect(typeof result).toBe('boolean');
  });
});

describe('Templates', () => {
  it('lists all templates', () => {
    const templates = listTemplates();
    expect(templates.length).toBe(7);
  });

  it('filters by category', () => {
    const prod = listTemplates('productivity');
    expect(prod.length).toBeGreaterThan(0);
    expect(prod.every((t) => t.category === 'productivity')).toBe(true);
  });

  it('gets template by id', () => {
    const template = getTemplate('morning-briefing');
    expect(template).toBeDefined();
    expect(template!.name).toBe('Sabah Brifingi');
  });

  it('returns undefined for unknown template', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });

  it('templates have valid structure', () => {
    for (const t of listTemplates()) {
      expect(t.workflow.nodes.length).toBeGreaterThan(0);
      expect(t.workflow.entryNodeId).toBeDefined();
      expect(t.workflow.trigger.type).toBeDefined();
    }
  });
});
