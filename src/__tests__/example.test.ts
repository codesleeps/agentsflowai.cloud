/**
 * Example test file demonstrating best practices for testing in AgentsFlowAI
 *
 * This file shows how to:
 * - Import test utilities
 * - Structure tests with describe/it blocks
 * - Mock authentication, database, and external APIs
 * - Test both success and error scenarios
 * - Use factories for test data generation
 * - Follow naming conventions and organization
 */

import { NextRequest } from "next/server";
import {
  // Auth mocks
  mockRequireAuth,
  createMockUser,

  // Database mocks
  mockPrisma,
  resetDatabaseMocks,

  // External API mocks
  mockAnthropicAPI,
  resetExternalAPIMocks,

  // Next.js mocks
  mockNextRequest,

  // Factories
  createMockLead,
  createMockAppointment,

  // Helpers
  createAuthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  validateLeadCreation,
} from "@/__tests__/utils";

describe("Example API Route Tests", () => {
  // Reset mocks before each test
  beforeEach(() => {
    resetDatabaseMocks();
    resetExternalAPIMocks();
  });

  describe("GET /api/leads", () => {
    it("should return leads for authenticated user", async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockLeads = [createMockLead(), createMockLead()];

      // Mock authentication
      const authMock = mockRequireAuth(mockUser);

      // Mock database query
      mockPrisma.lead.findMany.mockResolvedValue(mockLeads);

      // Create request
      const request = createAuthenticatedRequest("/api/leads", mockUser.id);

      // Mock the API handler (replace with actual import)
      const handler = jest
        .fn()
        .mockResolvedValue(Response.json({ leads: mockLeads }));

      // Act
      const response = await handler(request);

      // Assert
      expectSuccessResponse(response);
      expect(authMock).toHaveBeenCalledWith(request);

      const data = await response.json();
      expect(data.leads).toHaveLength(2);
      expect(mockPrisma.lead.findMany).toHaveBeenCalledTimes(1);
    });

    it("should return 401 for unauthenticated request", async () => {
      // Arrange
      const authMock = mockRequireAuth(null); // No user

      // Create unauthenticated request
      const request = mockNextRequest("/api/leads");

      // Mock the API handler
      const handler = jest
        .fn()
        .mockResolvedValue(
          Response.json({ error: "Unauthorized" }, { status: 401 }),
        );

      // Act
      const response = await handler(request);

      // Assert
      expectErrorResponse(response, 401);
      expect(authMock).toHaveBeenCalledWith(request);
    });
  });

  describe("POST /api/leads", () => {
    it("should create lead with valid data", async () => {
      // Arrange
      const mockUser = createMockUser();
      const leadData = {
        name: "John Doe",
        email: "john@example.com",
        source: "website",
      };

      const createdLead = createMockLead(leadData);

      // Mock authentication
      mockRequireAuth(mockUser);

      // Mock validation (should pass)
      const validationMock = jest.spyOn(
        require("@/lib/validation-schemas"),
        "validateAndSanitize",
      );
      validationMock.mockReturnValue(leadData);

      // Mock database creation
      mockPrisma.lead.create.mockResolvedValue(createdLead);

      // Create request with body
      const request = createAuthenticatedRequest("/api/leads", mockUser.id);
      // Add JSON body to request
      Object.defineProperty(request, "json", {
        value: jest.fn().mockResolvedValue(leadData),
      });

      // Mock the API handler
      const handler = jest
        .fn()
        .mockResolvedValue(
          Response.json({ lead: createdLead }, { status: 201 }),
        );

      // Act
      const response = await handler(request);

      // Assert
      expectSuccessResponse(response, 201);
      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: leadData,
      });

      const data = await response.json();
      expect(data.lead.id).toBe(createdLead.id);
    });

    it("should return 400 for invalid data", async () => {
      // Arrange
      const mockUser = createMockUser();
      const invalidData = {
        name: "", // Invalid: empty name
        email: "invalid-email", // Invalid: bad format
      };

      // Mock authentication
      mockRequireAuth(mockUser);

      // Create request with invalid body
      const request = createAuthenticatedRequest("/api/leads", mockUser.id);
      Object.defineProperty(request, "json", {
        value: jest.fn().mockResolvedValue(invalidData),
      });

      // Mock the API handler to throw validation error
      const handler = jest
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { issues: [{ message: "Name is required" }] } },
            { status: 400 },
          ),
        );

      // Act
      const response = await handler(request);

      // Assert
      expectErrorResponse(response, 400);
      expect(mockPrisma.lead.create).not.toHaveBeenCalled();
    });
  });

  describe("AI Integration Tests", () => {
    it("should generate text using Anthropic API", async () => {
      // Arrange
      const mockUser = createMockUser();
      const prompt = "Write a hello world function";
      const aiResponse = { content: "console.log('Hello, World!');" };

      // Mock authentication
      mockRequireAuth(mockUser);

      // Mock Anthropic API
      const anthropicMock = mockAnthropicAPI(aiResponse);

      // Create request
      const request = createAuthenticatedRequest(
        "/api/ai/generate-text",
        mockUser.id,
      );
      Object.defineProperty(request, "json", {
        value: jest.fn().mockResolvedValue({ prompt }),
      });

      // Mock the API handler
      const handler = jest
        .fn()
        .mockResolvedValue(Response.json({ result: aiResponse.content }));

      // Act
      const response = await handler(request);

      // Assert
      expectSuccessResponse(response);
      expect(anthropicMock).toHaveBeenCalledTimes(1);
      expect(anthropicMock).toHaveBeenCalledWith({
        messages: [{ role: "user", content: prompt }],
        model: expect.any(String),
        max_tokens: expect.any(Number),
      });
    });
  });

  describe("Appointment Creation", () => {
    it("should create appointment with lead association", async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockLead = createMockLead();
      const appointmentData = {
        lead_id: mockLead.id,
        title: "Discovery Call",
        scheduled_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        duration_minutes: 30,
      };

      const createdAppointment = createMockAppointment(appointmentData);

      // Mock authentication
      mockRequireAuth(mockUser);

      // Mock database operations
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.appointment.create.mockResolvedValue(createdAppointment);

      // Create request
      const request = createAuthenticatedRequest(
        "/api/appointments",
        mockUser.id,
      );
      Object.defineProperty(request, "json", {
        value: jest.fn().mockResolvedValue(appointmentData),
      });

      // Mock the API handler
      const handler = jest
        .fn()
        .mockResolvedValue(
          Response.json({ appointment: createdAppointment }, { status: 201 }),
        );

      // Act
      const response = await handler(request);

      // Assert
      expectSuccessResponse(response, 201);
      expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: mockLead.id },
      });
      expect(mockPrisma.appointment.create).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * Best Practices Demonstrated:
 *
 * 1. **Clear Test Structure**: Use describe/it blocks to organize tests logically
 * 2. **Arrange-Act-Assert Pattern**: Clearly separate test setup, execution, and verification
 * 3. **Mock Management**: Reset mocks between tests to avoid interference
 * 4. **Descriptive Test Names**: Tests should clearly describe what they're testing
 * 5. **Factory Usage**: Use factories to generate consistent test data
 * 6. **Helper Functions**: Use helper functions for common assertions
 * 7. **Error Scenarios**: Test both success and failure cases
 * 8. **Isolation**: Each test should be independent and not rely on others
 *
 * Naming Conventions:
 * - Test files: `*.test.ts` or `*.test.tsx`
 * - Test functions: `it("should do something specific")`
 * - Describe blocks: `describe("Feature or Component Name")`
 * - Mock variables: `mockVariableName`
 * - Factory variables: `mockEntityName`
 */
