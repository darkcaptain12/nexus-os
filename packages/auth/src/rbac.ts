import type { Role, Permission, RolePermissions } from './types';

export const ROLES: readonly Role[] = ['owner', 'admin', 'member', 'viewer', 'agent'] as const;

export const PERMISSIONS: readonly Permission[] = [
  'system.manage',
  'users.read',
  'users.write',
  'users.delete',
  'trades.read',
  'trades.write',
  'trades.execute',
  'orders.read',
  'orders.write',
  'orders.manage',
  'memory.read',
  'memory.write',
  'memory.delete',
  'agents.read',
  'agents.write',
  'agents.execute',
  'automation.read',
  'automation.write',
  'automation.execute',
  'notifications.read',
  'notifications.write',
  'settings.read',
  'settings.write',
] as const;

export const ROLE_PERMISSIONS: RolePermissions = {
  owner: PERMISSIONS,
  admin: PERMISSIONS.filter((p) => p !== 'system.manage'),
  member: [
    'users.read',
    'trades.read',
    'trades.write',
    'orders.read',
    'orders.write',
    'memory.read',
    'memory.write',
    'agents.read',
    'automation.read',
    'notifications.read',
    'notifications.write',
    'settings.read',
  ],
  viewer: [
    'users.read',
    'trades.read',
    'orders.read',
    'memory.read',
    'agents.read',
    'automation.read',
    'notifications.read',
    'settings.read',
  ],
  agent: [
    'memory.read',
    'memory.write',
    'agents.read',
    'agents.execute',
    'automation.read',
    'automation.execute',
    'notifications.write',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
