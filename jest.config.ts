import type { Config } from "jest";
import nextJest from "next/jest.js";

const config: Config = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // A preset that is used as a base for Jest's configuration
  preset: "ts-jest",

  // The test environment that will be used for testing
  testEnvironment: "node",

  // Test match patterns
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
    "**/*.test.ts",
    "**/*.test.tsx",
  ],

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },

  // Global test setup
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Test path ignore patterns
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/dist/"],

  // Module directories
  moduleDirectories: ["node_modules", "<rootDir>"],

  // Parallel execution
  maxWorkers: "50%",

  // Test timeout
  testTimeout: 10000,

  // Transform ES modules
  transformIgnorePatterns: ["node_modules/(?!(jose|@better-auth)/)"],
};

const createJestConfig = nextJest({
  dir: "./",
});

export default createJestConfig(config);
