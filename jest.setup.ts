import "@testing-library/jest-dom";

// Set up global test environment variables
process.env.TZ = "UTC";
(process.env as any).NODE_ENV = "test";

// Global mocks for Next.js specific modules
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  redirect: jest.fn(),
}));

jest.mock("next/headers", () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

// Suppress console warnings/errors for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    // Suppress specific expected errors in tests
    if (
      args[0]?.includes?.("Warning:") ||
      args[0]?.includes?.("ReactDOMTestUtils") ||
      args[0]?.includes?.("act()")
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    // Suppress specific expected warnings in tests
    if (
      args[0]?.includes?.("Warning:") ||
      args[0]?.includes?.("ReactDOMTestUtils")
    ) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global beforeEach/afterEach hooks for cleanup
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  // Additional cleanup if needed
});
