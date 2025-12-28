import { NextRequest } from "next/server";
import { POST } from "../generate-text/route";
import { requireAuth } from "@/lib/auth-helpers";
import { validateAndSanitize } from "@/lib/validation-schemas";
import { executeSimpleGeneration } from "@/server-lib/ai-fallback-handler";
import { logIntegrationError } from "@/server-lib/ai-usage-tracker";

// Mock dependencies
jest.mock("@/lib/auth-helpers");
jest.mock("@/lib/validation-schemas");
jest.mock("@/server-lib/ai-fallback-handler");
jest.mock("@/server-lib/ai-usage-tracker");

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockValidateAndSanitize = validateAndSanitize as jest.MockedFunction<
  typeof validateAndSanitize
>;
const mockExecuteSimpleGeneration =
  executeSimpleGeneration as jest.MockedFunction<
    typeof executeSimpleGeneration
  >;
const mockLogIntegrationError = logIntegrationError as jest.MockedFunction<
  typeof logIntegrationError
>;

describe("/api/integrations/ai/generate-text", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    mockRequireAuth.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/integrations/ai/generate-text",
      {
        method: "POST",
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("should return success when generation succeeds", async () => {
    const mockUser = {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    };
    const mockResult = {
      text: "Generated response",
      fallbackUsed: false,
      provider: "anthropic",
    };

    mockRequireAuth.mockResolvedValue(mockUser);
    mockValidateAndSanitize.mockReturnValue({
      prompt: "Test prompt",
      enableWebSearch: false,
      enableDeepResearch: false,
      reasoningEffort: "low",
      modelProvider: "openai",
    });
    mockExecuteSimpleGeneration.mockResolvedValue(mockResult);

    const request = new NextRequest(
      "http://localhost/api/integrations/ai/generate-text",
      {
        method: "POST",
        body: JSON.stringify({
          prompt: "Test prompt",
          enableWebSearch: false,
          enableDeepResearch: false,
          reasoningEffort: "low",
          modelProvider: "openai",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockResult);
  });

  it("should return fallback response when all providers fail", async () => {
    const mockUser = {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    };
    const mockError = new Error("All providers failed");

    mockRequireAuth.mockResolvedValue(mockUser);
    mockValidateAndSanitize.mockReturnValue({
      prompt: "Test prompt",
      enableWebSearch: false,
      enableDeepResearch: false,
      reasoningEffort: "low",
      modelProvider: "openai",
    });
    mockExecuteSimpleGeneration.mockRejectedValue(mockError);
    mockLogIntegrationError.mockResolvedValue(undefined);

    const request = new NextRequest(
      "http://localhost/api/integrations/ai/generate-text",
      {
        method: "POST",
        body: JSON.stringify({
          prompt: "Test prompt",
          enableWebSearch: false,
          enableDeepResearch: false,
          reasoningEffort: "low",
          modelProvider: "openai",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(503);
    const responseData = await response.json();
    expect(responseData.text).toContain(
      "I'm currently experiencing connectivity issues",
    );
    expect(responseData.fallbackUsed).toBe(true);
    expect(responseData.provider).toBe("static-fallback");
  });
  it("should handle invalid request body", async () => {
    const mockUser = {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    };

    mockRequireAuth.mockResolvedValue(mockUser);
    mockValidateAndSanitize.mockImplementation(() => {
      throw new Error("Invalid request");
    });

    const request = new NextRequest(
      "http://localhost/api/integrations/ai/generate-text",
      {
        method: "POST",
        body: JSON.stringify({
          invalid: "data",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(503);
    const responseData = await response.json();
    expect(responseData.text).toContain(
      "I'm currently experiencing connectivity issues",
    );
  });

  it("should log integration error when request fails", async () => {
    const mockUser = {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    };
    const mockError = new Error("Test error");

    mockRequireAuth.mockResolvedValue(mockUser);
    mockValidateAndSanitize.mockReturnValue({
      prompt: "Test prompt",
      enableWebSearch: false,
      enableDeepResearch: false,
      reasoningEffort: "low",
      modelProvider: "openai",
    });
    mockExecuteSimpleGeneration.mockRejectedValue(mockError);
    mockLogIntegrationError.mockResolvedValue(undefined);

    const request = new NextRequest(
      "http://localhost/api/integrations/ai/generate-text",
      {
        method: "POST",
        body: JSON.stringify({
          prompt: "Test prompt",
          enableWebSearch: false,
          enableDeepResearch: false,
          reasoningEffort: "low",
          modelProvider: "openai",
        }),
      },
    );

    await POST(request);

    expect(mockLogIntegrationError).toHaveBeenCalledWith(
      "user-123",
      "/api/integrations/ai/generate-text",
      mockError,
      "Test prompt",
    );
  });

  it("should handle different model providers", async () => {
    const mockUser = {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    };
    const mockResult = {
      text: "Generated response",
      fallbackUsed: false,
      provider: "google",
    };

    mockRequireAuth.mockResolvedValue(mockUser);
    mockValidateAndSanitize.mockReturnValue({
      prompt: "Test prompt",
      enableWebSearch: false,
      enableDeepResearch: false,
      reasoningEffort: "medium",
      modelProvider: "google",
    });
    mockExecuteSimpleGeneration.mockResolvedValue(mockResult);

    const request = new NextRequest(
      "http://localhost/api/integrations/ai/generate-text",
      {
        method: "POST",
        body: JSON.stringify({
          prompt: "Test prompt",
          enableWebSearch: false,
          enableDeepResearch: false,
          reasoningEffort: "medium",
          modelProvider: "google",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockResult);
  });

  it("should handle rate limiting gracefully", async () => {
    const mockUser = {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    };
    const mockError = new Error("Rate limit exceeded");

    mockRequireAuth.mockResolvedValue(mockUser);
    mockValidateAndSanitize.mockReturnValue({
      prompt: "Test prompt",
      enableWebSearch: false,
      enableDeepResearch: false,
      reasoningEffort: "low",
      modelProvider: "openai",
    });
    mockExecuteSimpleGeneration.mockRejectedValue(mockError);
    mockLogIntegrationError.mockResolvedValue(undefined);

    const request = new NextRequest(
      "http://localhost/api/integrations/ai/generate-text",
      {
        method: "POST",
        body: JSON.stringify({
          prompt: "Test prompt",
          enableWebSearch: false,
          enableDeepResearch: false,
          reasoningEffort: "low",
          modelProvider: "openai",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(503);
    const responseData = await response.json();
    expect(responseData.text).toContain(
      "I'm currently experiencing connectivity issues",
    );
  });
});
