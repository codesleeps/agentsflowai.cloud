import { PrismaClient } from "@prisma/client";

// Mock Prisma client
export const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  lead: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  appointment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  conversation: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

// Mock queryInternalDatabase function
export const mockQueryInternalDatabase = (result: any = null) => {
  const mockFn = jest.fn().mockResolvedValue(result);
  jest.doMock("@/server-lib/internal-db-query", () => ({
    queryInternalDatabase: mockFn,
  }));
  return mockFn;
};

// Create fully mocked Prisma client
export const createMockPrismaClient = (): PrismaClient => {
  return mockPrisma as any;
};

// Mock database error
export const mockDatabaseError = (message = "Database error") => {
  const error = new Error(message);
  error.name = "DatabaseError";
  return error;
};

// Helper functions for common mock responses
export const mockSuccessfulQuery = (data: any) => ({
  success: true,
  data,
  error: null,
});

export const mockFailedQuery = (errorMessage = "Query failed") => ({
  success: false,
  data: null,
  error: errorMessage,
});

export const mockEmptyResult = () => ({
  success: true,
  data: [],
  error: null,
});

// Reset all database mocks
export const resetDatabaseMocks = () => {
  Object.values(mockPrisma).forEach((mock) => {
    if (typeof mock === "object" && mock !== null) {
      Object.values(mock).forEach((method) => {
        if (jest.isMockFunction(method)) {
          method.mockClear();
        }
      });
    } else if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};
