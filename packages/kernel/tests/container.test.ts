import { describe, it, expect, beforeEach } from 'vitest';
import { KernelContainer } from '../src/runtime/impl/container.impl';

describe('KernelContainer', () => {
  let container: KernelContainer;

  beforeEach(() => {
    container = new KernelContainer();
  });

  describe('registration', () => {
    it('registers and resolves a singleton', () => {
      container.registerSingleton('config', () => ({ port: 3000 }));
      const a = container.resolve('config');
      const b = container.resolve('config');
      expect(a).toEqual({ port: 3000 });
      expect(a).toBe(b);
    });

    it('registers and resolves a transient', () => {
      container.registerTransient('counter', () => ({ count: Math.random() }));
      const a = container.resolve<{ count: number }>('counter');
      const b = container.resolve<{ count: number }>('counter');
      expect(a.count).not.toBe(b.count);
    });

    it('registers a value directly', () => {
      container.registerValue('version', '1.0.0');
      expect(container.resolve('version')).toBe('1.0.0');
    });

    it('throws on unknown token', () => {
      expect(() => container.resolve('missing')).toThrow('No binding registered');
    });

    it('tryResolve returns undefined for missing', () => {
      expect(container.tryResolve('missing')).toBeUndefined();
    });

    it('has() checks existence', () => {
      expect(container.has('x')).toBe(false);
      container.registerValue('x', 1);
      expect(container.has('x')).toBe(true);
    });

    it('unregister removes binding', () => {
      container.registerValue('x', 1);
      container.unregister('x');
      expect(container.has('x')).toBe(false);
    });
  });

  describe('circular dependency detection', () => {
    it('throws on circular resolve', () => {
      container.registerSingleton('a', (c) => ({ b: c.resolve('b') }));
      container.registerSingleton('b', (c) => ({ a: c.resolve('a') }));
      expect(() => container.resolve('a')).toThrow('Circular dependency');
    });
  });

  describe('scoped containers', () => {
    it('creates a scope with isolated instances', () => {
      container.registerSingleton('svc', () => ({ id: 'original' }));
      const scope = container.createScope('test-scope');
      expect(scope.scopeId).toBe('test-scope');
      const resolved = scope.resolve<{ id: string }>('svc');
      expect(resolved.id).toBe('original');
    });

    it('disposes scope without affecting parent', async () => {
      container.registerValue('val', 42);
      const scope = container.createScope();
      scope.resolve('val');
      await scope.disposeScope();
      expect(container.resolve('val')).toBe(42);
    });
  });

  describe('stats', () => {
    it('reports binding statistics', () => {
      container.registerSingleton('a', () => 1);
      container.registerTransient('b', () => 2);
      container.registerValue('c', 3);

      const stats = container.getStats();
      expect(stats.totalBindings).toBe(3);
      expect(stats.singletons).toBe(2);
      expect(stats.transients).toBe(1);
    });
  });

  describe('dispose', () => {
    it('disposes all bindings', async () => {
      let disposed = false;
      container.registerSingleton('disposable', () => ({
        dispose: async () => { disposed = true; },
      }));
      container.resolve('disposable');
      await container.dispose();
      expect(disposed).toBe(true);
      expect(container.getStats().totalBindings).toBe(0);
    });
  });
});
