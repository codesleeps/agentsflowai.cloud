// User roles enum
export const UserRole = {
  ADMIN: "admin",
  USER: "user",
  VIEWER: "viewer",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Role hierarchy (higher number = more permissions)
export const RoleHierarchy: Record<UserRole, number> = {
  [UserRole.ADMIN]: 100,
  [UserRole.USER]: 50,
  [UserRole.VIEWER]: 10,
};

// Check if a role has at least the required level
export function hasMinimumRole(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}

// Permission definitions
export const Permissions = {
  // User management
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",

  // Lead management
  LEAD_CREATE: "lead:create",
  LEAD_READ: "lead:read",
  LEAD_UPDATE: "lead:update",
  LEAD_DELETE: "lead:delete",

  // AI Agents
  AGENT_CREATE: "agent:create",
  AGENT_READ: "agent:read",
  AGENT_UPDATE: "agent:update",
  AGENT_DELETE: "agent:delete",

  // Analytics
  ANALYTICS_VIEW: "analytics:view",
  ANALYTICS_EXPORT: "analytics:export",

  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_UPDATE: "settings:update",

  // Integrations
  INTEGRATION_CREATE: "integration:create",
  INTEGRATION_READ: "integration:read",
  INTEGRATION_DELETE: "integration:delete",

  // API Keys
  APIKEY_CREATE: "apikey:create",
  APIKEY_READ: "apikey:read",
  APIKEY_DELETE: "apikey:delete",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// Role-based permission mapping
export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permissions), // Admin has all permissions
  [UserRole.USER]: [
    Permissions.USER_READ,
    Permissions.LEAD_CREATE,
    Permissions.LEAD_READ,
    Permissions.LEAD_UPDATE,
    Permissions.AGENT_READ,
    Permissions.ANALYTICS_VIEW,
    Permissions.INTEGRATION_READ,
    Permissions.APIKEY_READ,
  ],
  [UserRole.VIEWER]: [
    Permissions.USER_READ,
    Permissions.LEAD_READ,
    Permissions.AGENT_READ,
    Permissions.ANALYTICS_VIEW,
  ],
};

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = RolePermissions[role];
  return permissions.includes(permission);
}

// Check if user can perform action
export function canPerform(role: UserRole, action: Permission): boolean {
  return hasPermission(role, action);
}
