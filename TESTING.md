# Testing Guide for AgentsFlowAI

This document provides comprehensive guidance for testing in the AgentsFlowAI codebase.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Testing Philosophy

Our testing approach emphasizes:

- **Isolation**: Each test should be independent and not rely on external state
- **Readability**: Tests should be easy to understand and maintain
- **Coverage**: Aim for meaningful coverage that validates business logic
- **Speed**: Tests should run quickly to support rapid development
- **Reliability**: Tests should be deterministic and not flaky

## Project Structure

```
src/
├── __tests__/
│   ├── utils/                    # Test utilities and helpers
│   │   ├── mocks/               # Mock implementations
│   │   │   ├── auth.ts          # Authentication mocks
│   │   │   ├── database.ts      # Database/Prisma mocks
│   │   │   ├── external-apis.ts # External API mocks
│   │   │   └── next.ts          # Next.js specific mocks
│   │   ├── factories/           # Test data factories
│   │   │   ├── user.factory.ts
│   │   │   ├── lead.factory.ts
│   │   │   ├── appointment.factory.ts
│   │   │   └── conversation.factory.ts
│   │   ├── helpers/             # Test helper functions
│   │   │   ├── request.helper.ts
│   │   │   ├── response.helper.ts
│   │   │   └── validation.helper.ts
│   │   └── index.ts             # Centralized exports
│   └── example.test.ts          # Test examples and templates
├── app/api/
│   └── [endpoint]/
│       └── __tests__/           # API route tests
└── components/
    └── [component]/
        └── __tests__/           # Component tests
```

## Running Tests

### Available Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests for CI/CD (with coverage, limited workers)
npm run test:ci
```

### Test File Patterns

- Unit tests: `**/__tests__/**/*.test.ts`
- Integration tests: `**/integration/**/*.test.ts`
- Component tests: `**/__tests__/**/*.test.tsx`

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  mockRequireAuth,
  createMockUser,
  resetDatabaseMocks,
} from "@/__tests__/utils";

describe("Feature Name", () => {
  beforeEach(() => {
    // Setup before each test
    resetDatabaseMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });

  describe("Specific Functionality", () => {
    it("should do something specific", async () => {
      // Arrange
      const mockUser = createMockUser();
      mockRequireAuth(mockUser);

      // Act
      const result = await someFunction();

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Testing API Routes

```typescript
import {
  createAuthenticatedRequest,
  expectSuccessResponse,
} from "@/__tests__/utils";

it("should return data for authenticated request", async () => {
  // Arrange
  const user = createMockUser();
  const request = createAuthenticatedRequest("/api/leads", user.id);

  // Mock dependencies
  mockPrisma.lead.findMany.mockResolvedValue([]);

  // Act
  const response = await GET(request);

  // Assert
  expectSuccessResponse(response);
  const data = await response.json();
  expect(data.leads).toEqual([]);
});
```

### Testing Components (React)

```typescript
import { render, screen } from "@testing-library/react";
import { createMockUser } from "@/__tests__/utils";

it("should render user information", () => {
  // Arrange
  const user = createMockUser({ name: "John Doe" });

  // Act
  render(<UserProfile user={user} />);

  // Assert
  expect(screen.getByText("John Doe")).toBeInTheDocument();
});
```

## Test Utilities

### Authentication Mocks

```typescript
import {
  mockRequireAuth,
  createMockUser,
  mockAuthError,
} from "@/__tests__/utils";

// Mock successful authentication
const user = createMockUser();
mockRequireAuth(user);

// Mock authentication failure
mockRequireAuth(null); // or mockAuthError("Invalid token");
```

### Database Mocks

```typescript
import { mockPrisma, resetDatabaseMocks } from "@/__tests__/utils";

// Mock database queries
mockPrisma.user.findUnique.mockResolvedValue(mockUser);
mockPrisma.lead.create.mockResolvedValue(createdLead);

// Reset between tests
resetDatabaseMocks();
```

### External API Mocks

```typescript
import {
  mockAnthropicAPI,
  mockOpenAI,
  resetExternalAPIMocks,
} from "@/__tests__/utils";

// Mock AI API responses
mockAnthropicAPI({ content: "Mock response" });
mockOpenAI({ choices: [{ message: { content: "AI response" } }] });

// Reset mocks
resetExternalAPIMocks();
```

### Data Factories

```typescript
import {
  createMockUser,
  createMockLead,
  createMockAppointment,
} from "@/__tests__/utils";

// Generate test data
const user = createMockUser({ name: "Custom Name" });
const leads = createMockLeads(5); // Array of 5 leads
const appointment = createMockAppointment({ title: "Custom Title" });
```

### Request/Response Helpers

```typescript
import {
  createAuthenticatedRequest,
  createRequestWithBody,
  expectSuccessResponse,
  expectErrorResponse,
} from "@/__tests__/utils";

// Create requests
const getRequest = createAuthenticatedRequest("/api/leads");
const postRequest = createRequestWithBody("/api/leads", leadData);

// Assert responses
expectSuccessResponse(response, 201);
expectErrorResponse(response, 400);
```

### Validation Helpers

```typescript
import {
  validateLeadCreation,
  expectSchemaToPass,
  expectSchemaToFail,
} from "@/__tests__/utils";

// Test schema validation
expectSchemaToPass(LeadCreateSchema, validData);
expectSchemaToFail(LeadCreateSchema, invalidData);
```

## Best Practices

### 1. Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names that explain the behavior being tested
- Keep test files focused on a single module or feature

### 2. Mock Management

- Reset mocks between tests to avoid interference
- Use specific mocks rather than general ones when possible
- Mock at the module boundary, not internal functions

### 3. Test Data

- Use factories to generate consistent test data
- Override specific fields when testing edge cases
- Avoid hard-coded IDs; use generated ones

### 4. Assertions

- Use specific matchers (`toBe`, `toEqual`, `toContain`)
- Test both positive and negative scenarios
- Assert the correct number of function calls

### 5. Async Testing

- Always await async operations
- Use `jest.mocked()` for type-safe mocks
- Handle promise rejections appropriately

### 6. Error Testing

- Test error conditions and edge cases
- Verify error messages and status codes
- Ensure proper error handling

### 7. Performance

- Keep tests fast and focused
- Avoid unnecessary setup/teardown
- Use `beforeAll`/`afterAll` for expensive operations

## Naming Conventions

### Files

- Test files: `*.test.ts` or `*.test.tsx`
- Test utilities: `*.helper.ts`, `*.factory.ts`, `*.mock.ts`

### Functions and Variables

- Test functions: `it("should do something specific")`
- Mock functions: `mockFunctionName`
- Factory functions: `createMockEntityName`
- Helper functions: `expectSomething` or `createSomething`

### Examples

```typescript
// Good
it("should create lead with valid data");
it("should return 400 for invalid email format");
it("should handle database connection errors");

// Avoid
it("test 1");
it("works");
it("error case");
```

## Troubleshooting

### Common Issues

#### Tests are slow

- Check for unnecessary database connections
- Use `beforeAll`/`afterAll` for setup that can be shared
- Mock external dependencies

#### Tests are flaky

- Ensure proper mock cleanup between tests
- Avoid relying on timing or external state
- Use deterministic data generation

#### TypeScript errors in tests

- Import types from the correct modules
- Use `jest.mocked()` for mocked functions
- Check that test utilities are properly typed

#### Mock functions not working

- Ensure mocks are reset between tests
- Check import paths and module resolution
- Verify that the correct functions are being mocked

### Debugging Tests

```typescript
// Add logging to debug
console.log("Debug info:", variable);

// Use Jest debug mode
npm test -- --verbose

// Run specific test
npm test -- --testNamePattern="should create lead"

// Debug with VS Code
// Add breakpoint and run test in debug mode
```

### Coverage Issues

```bash
# Check coverage report
npm run test:coverage

# Exclude files from coverage
// In jest.config.ts
collectCoverageFrom: [
  "src/**/*.{ts,tsx}",
  "!src/**/*.d.ts",
  "!src/**/__tests__/**",
],
```

## Integration with Development Workflow

### Pre-commit Hooks

- Run tests before committing
- Use `lint-staged` to run tests on changed files

### CI/CD Integration

- Use `npm run test:ci` for automated testing
- Set coverage thresholds to prevent regressions
- Parallel test execution for faster builds

### Code Review

- Review test coverage for new features
- Ensure tests are readable and maintainable
- Check that edge cases are covered

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

## Contributing

When adding new tests:

1. Follow the established patterns and conventions
2. Add tests for new features and bug fixes
3. Update this documentation if new patterns are introduced
4. Ensure tests pass in CI/CD before merging

For questions about testing, reach out to the development team or check existing test files for examples.
