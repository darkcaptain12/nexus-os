import { describe, it, expect, beforeAll } from 'vitest';
import { selectGraphContext } from '../src/lib/knowledge/context-selector';
import { link } from '../src/lib/knowledge/relationship-engine';

const P = `CTX${Date.now()}`;

beforeAll(() => {
  link({ type: 'project', name: `${P} Mobil Uygulama` }, 'depends_on', {
    type: 'task',
    name: `${P} API tasarımı`,
  });
  link({ type: 'task', name: `${P} API tasarımı` }, 'blocked_by', {
    type: 'decision',
    name: `${P} Auth kararı`,
  });
  link({ type: 'agent', name: `${P} Derleyici Ajan` }, 'owns', {
    type: 'task',
    name: `${P} API tasarımı`,
  });
});

describe('Context Builder v2 — selectGraphContext', () => {
  it('konuyla ilgili node ve komşularını seçer', () => {
    const ctx = selectGraphContext(`${P} API tasarımı`);
    expect(ctx.nodes.length).toBeGreaterThan(0);
    const names = ctx.nodes.map((n) => n.name);
    expect(names).toContain(`${P} API tasarımı`);
    // 1-hop komşular da gelmeli
    expect(
      names.some(
        (n) =>
          n.includes('Mobil Uygulama') || n.includes('Auth kararı') || n.includes('Derleyici Ajan'),
      ),
    ).toBe(true);
  });

  it('ilişkiler okunabilir formatta döner', () => {
    const ctx = selectGraphContext(`${P} API tasarımı`);
    expect(ctx.relations.some((r) => r.includes('-->'))).toBe(true);
  });

  it('en fazla 12 node döner (kompakt context)', () => {
    const ctx = selectGraphContext(`${P} API`);
    expect(ctx.nodes.length).toBeLessThanOrEqual(12);
  });

  it('durationMs gerçek ölçüm', () => {
    const ctx = selectGraphContext('herhangi bir konu');
    expect(ctx.durationMs).toBeGreaterThanOrEqual(0);
    expect(ctx.topic).toBe('herhangi bir konu');
  });

  it('boş konu çökmez', () => {
    const ctx = selectGraphContext('xyzhiçyokböylebirşey123');
    expect(Array.isArray(ctx.nodes)).toBe(true);
  });
});
