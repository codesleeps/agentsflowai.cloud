import type { AuthenticatedUser } from "@/lib/auth-helpers";

// Mock authenticated user
export const createMockUser = (
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser => ({
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  role: "user",
  image: null,
  ...overrides,
});

// Mock requireAuth function
export const mockRequireAuth = (user: AuthenticatedUser = createMockUser()) => {
  const mockFn = jest.fn().mockResolvedValue(user);
  jest.doMock("@/lib/auth-helpers", () => ({
    requireAuth: mockFn,
  }));
  return mockFn;
};

// Mock getUserFromRequest function
export const mockGetUserFromRequest = (
  user: AuthenticatedUser | null = createMockUser(),
) => {
  const mockFn = jest.fn().mockResolvedValue(user);
  jest.doMock("@/lib/auth-helpers", () => ({
    getUserFromRequest: mockFn,
  }));
  return mockFn;
};

// Mock authentication error
export const mockAuthError = (message = "Unauthorized") => {
  const error = new Error(message);
  error.name = "AuthenticationError";
  return error;
};

// Mock Better Auth session
export const mockSession = (user: AuthenticatedUser = createMockUser()) => ({
  user,
  session: {
    id: "session-123",
    userId: user.id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    token: "mock-token",
  },
});

// Reset all auth mocks
export const resetAuthMocks = () => {
  jest.clearAllMocks();
  jest.resetModules();
};
