// Central definition of which roles can access which feature areas.
// Used by backend route guards AND exposed to the frontend via /auth/me
// so the UI can hide buttons the user isn't allowed to use.

export const ROLES = [
  'OWNER',
  'MANAGER',
  'WAREHOUSE_STAFF',
  'CASHIER',
  'SALESPERSON',
  'PROCUREMENT_MANAGER',
  'HR',
  'AUDITOR',
] as const;

export type Role = (typeof ROLES)[number];

// Feature areas mapped to roles allowed to access them.
// OWNER and MANAGER get everything by default (see hasAccess below).
export const FEATURE_ACCESS: Record<string, Role[]> = {
  dashboard: ['OWNER', 'MANAGER', 'WAREHOUSE_STAFF', 'CASHIER', 'SALESPERSON', 'PROCUREMENT_MANAGER', 'HR', 'AUDITOR'],
  billing: ['OWNER', 'MANAGER', 'CASHIER', 'SALESPERSON'],
  scanner: ['OWNER', 'MANAGER', 'WAREHOUSE_STAFF'],
  inventory: ['OWNER', 'MANAGER', 'WAREHOUSE_STAFF', 'AUDITOR'],
  suppliers: ['OWNER', 'MANAGER', 'PROCUREMENT_MANAGER'],
  purchaseOrders: ['OWNER', 'MANAGER', 'PROCUREMENT_MANAGER'],
  aiAlerts: ['OWNER', 'MANAGER'],
  reports: ['OWNER', 'MANAGER', 'AUDITOR'],
};

export function hasAccess(role: string, feature: keyof typeof FEATURE_ACCESS): boolean {
  if (role === 'OWNER') return true; // Owner always has full access
  const allowed = FEATURE_ACCESS[feature];
  return allowed ? allowed.includes(role as Role) : false;
}