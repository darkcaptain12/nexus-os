export type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'agent';

export type Permission =
  | 'system.manage'
  | 'users.read'
  | 'users.write'
  | 'users.delete'
  | 'trades.read'
  | 'trades.write'
  | 'trades.execute'
  | 'orders.read'
  | 'orders.write'
  | 'orders.manage'
  | 'memory.read'
  | 'memory.write'
  | 'memory.delete'
  | 'agents.read'
  | 'agents.write'
  | 'agents.execute'
  | 'automation.read'
  | 'automation.write'
  | 'automation.execute'
  | 'notifications.read'
  | 'notifications.write'
  | 'settings.read'
  | 'settings.write';

export type RolePermissions = Record<Role, readonly Permission[]>;

export interface AuthContext {
  userId: string;
  role: Role;
  permissions: readonly Permission[];
}
