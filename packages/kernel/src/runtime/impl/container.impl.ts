import type { ServiceScope } from '../../core/types';
import type { Binding, BindingFactory, ContainerStats, CircularDependencyError, ScopedContext } from '../../container/types';
import type { Container, ScopedContainer } from '../../container/interfaces';

export class KernelContainer implements Container {
  private bindings = new Map<string, Binding>();
  private resolvingStack: string[] = [];
  private scopes = new Map<string, KernelScopedContainer>();
  private totalResolved = 0;

  register<T>(token: string, factory: BindingFactory<T>, scope: ServiceScope = 'singleton'): void {
    this.bindings.set(token, {
      token,
      scope,
      factory: factory as BindingFactory,
      metadata: {
        registeredAt: new Date().toISOString(),
        resolvedCount: 0,
        tags: [],
        lazy: scope === 'lazy',
      },
    });
  }

  registerSingleton<T>(token: string, factory: BindingFactory<T>): void {
    this.register(token, factory, 'singleton');
  }

  registerTransient<T>(token: string, factory: BindingFactory<T>): void {
    this.register(token, factory, 'transient');
  }

  registerScoped<T>(token: string, factory: BindingFactory<T>): void {
    this.register(token, factory, 'scoped');
  }

  registerLazy<T>(token: string, factory: BindingFactory<T>): void {
    this.register(token, factory, 'lazy');
  }

  registerValue<T>(token: string, value: T): void {
    this.bindings.set(token, {
      token,
      scope: 'singleton',
      factory: () => value,
      instance: value,
      metadata: {
        registeredAt: new Date().toISOString(),
        resolvedCount: 0,
        tags: [],
        lazy: false,
      },
    });
  }

  resolve<T>(token: string): T {
    const binding = this.bindings.get(token);
    if (!binding) {
      throw new Error(`No binding registered for token: ${token}`);
    }

    if (this.resolvingStack.includes(token)) {
      const cycle = [...this.resolvingStack, token];
      throw new Error(`Circular dependency detected: ${cycle.join(' → ')}`);
    }

    this.resolvingStack.push(token);
    try {
      const instance = this.resolveBinding<T>(binding);
      binding.metadata.resolvedCount++;
      binding.metadata.lastResolvedAt = new Date().toISOString();
      this.totalResolved++;
      return instance;
    } finally {
      this.resolvingStack.pop();
    }
  }

  tryResolve<T>(token: string): T | undefined {
    try {
      return this.resolve<T>(token);
    } catch {
      return undefined;
    }
  }

  has(token: string): boolean {
    return this.bindings.has(token);
  }

  unregister(token: string): void {
    this.bindings.delete(token);
  }

  createScope(scopeId?: string): ScopedContainer {
    const id = scopeId ?? crypto.randomUUID();
    const scoped = new KernelScopedContainer(id, this);
    this.scopes.set(id, scoped);
    return scoped;
  }

  validateDependencies(): CircularDependencyError[] {
    const errors: CircularDependencyError[] = [];
    for (const token of this.bindings.keys()) {
      try {
        this.resolvingStack = [];
        this.detectCycles(token, []);
      } catch (e) {
        if (e instanceof Error && e.message.includes('Circular')) {
          errors.push({
            chain: [...this.resolvingStack, token],
            message: e.message,
          });
        }
      }
    }
    this.resolvingStack = [];
    return errors;
  }

  getStats(): ContainerStats {
    let singletons = 0;
    let transients = 0;
    let scoped = 0;
    let lazy = 0;
    for (const binding of this.bindings.values()) {
      switch (binding.scope) {
        case 'singleton': singletons++; break;
        case 'transient': transients++; break;
        case 'scoped': scoped++; break;
        case 'lazy': lazy++; break;
      }
    }
    return {
      totalBindings: this.bindings.size,
      singletons,
      transients,
      scoped,
      lazy,
      resolvedCount: this.totalResolved,
      activeScopes: this.scopes.size,
    };
  }

  async dispose(): Promise<void> {
    for (const scope of this.scopes.values()) {
      await scope.disposeScope();
    }
    this.scopes.clear();
    for (const binding of this.bindings.values()) {
      if (binding.instance && typeof (binding.instance as Record<string, unknown>).dispose === 'function') {
        await (binding.instance as { dispose(): Promise<void> }).dispose();
      }
    }
    this.bindings.clear();
  }

  private resolveBinding<T>(binding: Binding): T {
    if (binding.scope === 'transient') {
      return binding.factory(this) as T;
    }
    if (binding.instance !== undefined) {
      return binding.instance as T;
    }
    if (binding.scope === 'lazy') {
      const proxy = new Proxy({} as Record<string, unknown>, {
        get: (_target, prop) => {
          if (!binding.instance) {
            binding.instance = binding.factory(this);
          }
          return (binding.instance as Record<string, unknown>)[prop as string];
        },
      });
      binding.instance = proxy;
      return proxy as T;
    }
    const instance = binding.factory(this);
    binding.instance = instance;
    return instance as T;
  }

  private detectCycles(token: string, visited: string[]): void {
    if (visited.includes(token)) {
      throw new Error(`Circular dependency detected: ${[...visited, token].join(' → ')}`);
    }
  }
}

class KernelScopedContainer implements ScopedContainer {
  readonly scopeId: string;
  readonly context: ScopedContext;
  private parent: KernelContainer;
  private instances = new Map<string, unknown>();

  constructor(scopeId: string, parent: KernelContainer) {
    this.scopeId = scopeId;
    this.parent = parent;
    this.context = {
      id: scopeId,
      instances: this.instances,
      createdAt: new Date().toISOString(),
      disposables: [],
    };
  }

  register<T>(token: string, factory: BindingFactory<T>, scope?: ServiceScope): void {
    this.parent.register(token, factory, scope);
  }

  registerSingleton<T>(token: string, factory: BindingFactory<T>): void {
    this.parent.registerSingleton(token, factory);
  }

  registerTransient<T>(token: string, factory: BindingFactory<T>): void {
    this.parent.registerTransient(token, factory);
  }

  registerScoped<T>(token: string, factory: BindingFactory<T>): void {
    this.parent.registerScoped(token, factory);
  }

  registerLazy<T>(token: string, factory: BindingFactory<T>): void {
    this.parent.registerLazy(token, factory);
  }

  registerValue<T>(token: string, value: T): void {
    this.parent.registerValue(token, value);
  }

  resolve<T>(token: string): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }
    const resolved = this.parent.resolve<T>(token);
    this.instances.set(token, resolved);
    return resolved;
  }

  tryResolve<T>(token: string): T | undefined {
    try {
      return this.resolve<T>(token);
    } catch {
      return undefined;
    }
  }

  has(token: string): boolean {
    return this.instances.has(token) || this.parent.has(token);
  }

  unregister(token: string): void {
    this.instances.delete(token);
    this.parent.unregister(token);
  }

  createScope(scopeId?: string): ScopedContainer {
    return this.parent.createScope(scopeId);
  }

  validateDependencies(): CircularDependencyError[] {
    return this.parent.validateDependencies();
  }

  getStats(): ContainerStats {
    return this.parent.getStats();
  }

  async dispose(): Promise<void> {
    await this.disposeScope();
  }

  async disposeScope(): Promise<void> {
    for (const disposable of this.context.disposables) {
      await disposable.dispose();
    }
    this.instances.clear();
    this.context.disposables = [];
  }
}
