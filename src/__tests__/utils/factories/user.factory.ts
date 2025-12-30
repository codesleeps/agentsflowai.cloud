import type { AuthenticatedUser } from "@/lib/auth-helpers";

let userCounter = 1;

export const createMockUser = (
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser => ({
  id: `user-${userCounter++}`,
  name: "Test User",
  email: `test${userCounter}@example.com`,
  role: "user",
  image: null,
  ...overrides,
});

export const createMockUsers = (
  count: number,
  overrides: Partial<AuthenticatedUser>[] | Partial<AuthenticatedUser> = {},
): AuthenticatedUser[] => {
  return Array.from({ length: count }, (_, index) => {
    const userOverrides = Array.isArray(overrides)
      ? overrides[index] || {}
      : overrides;
    return createMockUser({
      id: `user-${index + 1}`,
      email: `test${index + 1}@example.com`,
      ...userOverrides,
    });
  });
};

export const createMockAdminUser = (
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser => {
  return createMockUser({
    role: "admin",
    name: "Admin User",
    ...overrides,
  });
};

export const createMockManagerUser = (
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser => {
  return createMockUser({
    role: "manager",
    name: "Manager User",
    ...overrides,
  });
};
