import { NextRequest } from "next/server";
import { POST } from "../route";
import { logModelUsage } from "@/server-lib/ai-usage-tracker";

// Mock the dependencies
jest.mock("@/server-lib/ai-usage-tracker");
jest.mock("@/lib/auth-helpers", () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: "test-user-id" }),
}));
jest.mock("@/lib/validation-schemas", () => ({
  validateAndSanitize: jest.fn().mockReturnValue({
    agentId: "web-dev-agent",
    message: "Create a React component",
    conversationHistory: [],
  }),
}));
jest.mock("@/shared/models/ai-agents", () => ({
  AI_AGENTS: [
    {
      id: "web-dev-agent",
      name: "Web Development Agent",
      systemPrompt: "You are a web development expert.",
      supportedProviders: [
        { provider: "google", model: "gemini-2.5-flash", priority: 1 },
        { provider: "openrouter", model: "gpt-4", priority: 2 },
        { provider: "ollama", model: "llama2", priority: 3 },
      ],
      defaultProvider: "google",
    },
  ],
}));
jest.mock("@/lib/api-errors", () => ({
  handleApiError: jest.fn().mockImplementation((error) => {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }),
}));
jest.mock("cheerio");
jest.mock("axios");

// Mock fetch for all providers
global.fetch = jest.fn();

describe("AI Agents API Error Handling", () => {
  const mockLogModelUsage = logModelUsage as jest.MockedFunction<typeof logModelUsage>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogModelUsage.mockResolvedValue(undefined);
  });

  describe("Google Provider Error Handling", () => {
    it("should handle timeout errors correctly", async () => {
      // Mock Google Generative AI to timeout
      const mockGenerateContent = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          response: { text: () => "Test response" }
        }), 35000)) // Longer than timeout
      );

      jest.doMock("@google/generative-ai", () => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGenerateContent,
          }),
        })),
      }));

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.model).toBe("fallback");
      expect(data.note).toContain("failed after");
      expect(data.errorLog).toBeDefined();
      expect(data.errorLog.length).toBeGreaterThan(0);
    });

    it("should handle API authentication errors", async () => {
      const mockGenerateContent = jest.fn().mockRejectedValue(
        new Error("API_KEY_INVALID")
      );

      jest.doMock("@google/generative-ai", () => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGenerateContent,
          }),
        })),
      }));

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      expect(data.errorLog.some((entry: any) => entry.error.includes("API_KEY_INVALID"))).toBe(true);
    });

    it("should handle rate limit errors", async () => {
      const mockGenerateContent = jest.fn().mockRejectedValue(
        new Error("Quota exceeded")
      );

      jest.doMock("@google/generative-ai", () => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGenerateContent,
          }),
        })),
      }));

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      expect(data.errorLog.some((entry: any) => entry.error.includes("Quota exceeded"))).toBe(true);
    });
  });

  describe("OpenRouter Provider Error Handling", () => {
    beforeEach(() => {
      // Mock Google provider to fail so it falls back to OpenRouter
      jest.doMock("@google/generative-ai", () => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockRejectedValue(new Error("Google failed")),
          }),
        })),
      }));
    });

    it("should handle HTTP 401 authentication errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ error: { message: "Invalid API key" } }),
      });

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      expect(data.errorLog.some((entry: any) => entry.provider === "openrouter")).toBe(true);
    });

    it("should handle HTTP 429 rate limit errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: jest.fn().mockResolvedValue({ error: { message: "Rate limit exceeded" } }),
      });

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      expect(data.errorLog.some((entry: any) => entry.error.includes("Rate limit exceeded"))).toBe(true);
    });

    it("should handle timeout errors", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: false,
          status: 408,
          json: jest.fn().mockResolvedValue({ error: { message: "Request timeout" } }),
        }), 35000))
      );

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      expect(data.errorLog.length).toBeGreaterThan(1); // Should have both Google and OpenRouter failures
    });

    it("should handle AbortError/timeout network errors", async () => {
      // Mock fetch to throw AbortError (which happens when AbortSignal.timeout is reached)
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      const openrouterEntry = data.errorLog.find((entry: any) => entry.provider === "openrouter");
      expect(openrouterEntry).toBeDefined();
      expect(openrouterEntry.error).toContain("Request aborted due to timeout after 30s");
    });

    it("should handle network connection errors", async () => {
      // Mock fetch to throw network errors like ECONNREFUSED
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("ECONNREFUSED: Connection refused")
      );

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      const openrouterEntry = data.errorLog.find((entry: any) => entry.provider === "openrouter");
      expect(openrouterEntry).toBeDefined();
      expect(openrouterEntry.error).toContain("ECONNREFUSED: Connection refused");
    });

    it("should handle generic fetch errors", async () => {
      // Mock fetch to throw generic network/fetch errors
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Failed to fetch")
      );

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      const openrouterEntry = data.errorLog.find((entry: any) => entry.provider === "openrouter");
      expect(openrouterEntry).toBeDefined();
      expect(openrouterEntry.error).toContain("Failed to fetch");
    });
  });

  describe("Ollama Provider Error Handling", () => {
    beforeEach(() => {
      // Mock previous providers to fail
      jest.doMock("@google/generative-ai", () => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockRejectedValue(new Error("Google failed")),
          }),
        })),
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({}),
      });
    });

    it("should handle connection refused errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("ECONNREFUSED: Connection refused")
      );

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      expect(data.errorLog.some((entry: any) => entry.error.includes("Connection refused"))).toBe(true);
    });

    it("should handle model not found errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({}),
      });

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      expect(data.errorLog.some((entry: any) => entry.error.includes("not found"))).toBe(true);
    });

    it("should handle timeout errors", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: false,
          status: 408,
          json: jest.fn().mockResolvedValue({}),
        }), 35000))
      );

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      expect(data.errorLog.length).toBeGreaterThan(2); // Should have all three provider failures
    });
  });

  describe("Fallback Response Generation", () => {
    beforeEach(() => {
      // Mock all providers to fail
      jest.doMock("@google/generative-ai", () => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockRejectedValue(new Error("All providers failed")),
          }),
        })),
      }));

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: { message: "Service unavailable" } }),
      });
    });

    it("should generate diagnostic information in fallback response", async () => {
      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.response).toContain("Diagnostic Information");
      expect(data.response).toContain("Agent ID:");
      expect(data.response).toContain("Total Attempts:");
      expect(data.errorLog).toBeDefined();
      expect(data.errorLog.length).toBeGreaterThan(0);
      expect(data.note).toContain("failed after");
    });

    it("should include troubleshooting steps for API key errors", async () => {
      // Mock specific API key error
      jest.doMock("@google/generative-ai", () => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockRejectedValue(new Error("API_KEY_INVALID")),
          }),
        })),
      }));

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.response).toContain("API Key");
      expect(data.response).toContain("environment variables");
    });

    it("should include troubleshooting steps for connection errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("ECONNREFUSED: Connection refused")
      );

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.response).toContain("Ollama Connection");
      expect(data.response).toContain("ollama serve");
    });
  });

  describe("Error Log Structure", () => {
    it("should create properly structured error logs", async () => {
      // Mock all providers to fail with different errors
      jest.doMock("@google/generative-ai", () => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
          getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockRejectedValue(new Error("Google API timeout")),
          }),
        })),
      }));

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: jest.fn().mockResolvedValue({ error: { message: "Rate limited" } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: jest.fn().mockResolvedValue({}),
        });

      const request = new NextRequest("http://localhost:3000/api/ai/agents", {
        method: "POST",
        body: JSON.stringify({
          agentId: "web-dev-agent",
          message: "Create a React component",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.errorLog).toBeDefined();
      expect(Array.isArray(data.errorLog)).toBe(true);

      data.errorLog.forEach((entry: any) => {
        expect(entry).toHaveProperty("provider");
        expect(entry).toHaveProperty("model");
        expect(entry).toHaveProperty("error");
        expect(entry).toHaveProperty("duration");
        expect(entry).toHaveProperty("timestamp");
        expect(typeof entry.duration).toBe("number");
        expect(entry.duration).toBeGreaterThan(0);
        expect(entry.timestamp).toBeInstanceOf(Date);
      });

      // Should have entries for all three providers
      const providers = data.errorLog.map((entry: any) => entry.provider);
      expect(providers).toContain("google");
      expect(providers).toContain("openrouter");
      expect(providers).toContain("ollama");
    });
  });
});
