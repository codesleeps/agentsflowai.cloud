/**
 * Test utilities for AI fallback chain integration tests
 */

import { jest } from '@jest/globals';
import { AIAgent, AIProvider } from '@/shared/models/ai-agents';
import { AIMessage } from '@/shared/models/types';

// ============================================
// Mock User Data
// ============================================

export const TEST_USER = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
};

export const TEST_USER_ADMIN = {
  id: 'test-admin-456',
  name: 'Test Admin',
  email: 'admin@example.com',
  role: 'admin',
};

// ============================================
// Test Agent Factory
// ============================================

export interface TestAgentConfig {
  id: string;
  name: string;
  defaultProvider: AIProvider;
  supportedProviders: Array<{
    provider: AIProvider;
    model: string;
    priority: number;
  }>;
  ollamaModelSize?: 'small' | 'medium' | 'large';
}

export function createTestAgent(config: TestAgentConfig): AIAgent {
  return {
    id: config.id,
    name: config.name,
    description: `Test agent: ${config.name}`,
    icon: '🧪',
    category: 'web-development',
    systemPrompt: `You are a test agent for ${config.name}`,
    capabilities: ['Test capability'],
    model: config.supportedProviders[0]?.model || 'test-model',
    provider: config.defaultProvider,
    defaultProvider: config.defaultProvider,
    costTier: 'low',
    isActive: true,
    ollamaModelSize: config.ollamaModelSize,
    supportedProviders: config.supportedProviders,
    usage_count: 0,
  };
}

export const TEST_AGENTS = {
  fastChat: createTestAgent({
    id: 'fast-chat-agent',
    name: 'Fast Chat Agent',
    defaultProvider: 'google',
    supportedProviders: [
      { provider: 'google', model: 'gemini-1.5-flash', priority: 1 },
      { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', priority: 2 },
      { provider: 'ollama', model: 'mistral:7b', priority: 3 },
    ],
    ollamaModelSize: 'small',
  }),
  webDev: createTestAgent({
    id: 'web-dev-agent',
    name: 'Web Development Agent',
    defaultProvider: 'openrouter',
    supportedProviders: [
      { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', priority: 1 },
      { provider: 'openai', model: 'gpt-4o-mini', priority: 2 },
      { provider: 'google', model: 'gemini-1.5-flash', priority: 3 },
      { provider: 'ollama', model: 'codellama:7b', priority: 4 },
    ],
    ollamaModelSize: 'large',
  }),
  analytics: createTestAgent({
    id: 'analytics-agent',
    name: 'Analytics Agent',
    defaultProvider: 'openrouter',
    supportedProviders: [
      { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', priority: 1 },
      { provider: 'google', model: 'gemini-1.5-flash', priority: 2 },
      { provider: 'ollama', model: 'mistral:7b', priority: 3 },
    ],
    ollamaModelSize: 'large',
  }),
  content: createTestAgent({
    id: 'content-agent',
    name: 'Content Creation Agent',
    defaultProvider: 'google',
    supportedProviders: [
      { provider: 'google', model: 'gemini-1.5-pro', priority: 1 },
      { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', priority: 2 },
    ],
    ollamaModelSize: 'medium',
  }),
};

// ============================================
// Provider Mock Helpers
// ============================================

export interface MockProviderResponse {
  response: string;
  tokensUsed?: number;
  cost?: number;
  promptTokens?: number;
  completionTokens?: number;
  modelUsed?: string;
}

export function mockProviderSuccess(
  response: string,
  options: {
    tokensUsed?: number;
    cost?: number;
    promptTokens?: number;
    completionTokens?: number;
    modelUsed?: string;
  } = {}
): MockProviderResponse {
  return {
    response,
    tokensUsed: options.tokensUsed ?? 100,
    cost: options.cost ?? 0,
    promptTokens: options.promptTokens ?? 50,
    completionTokens: options.completionTokens ?? 50,
    modelUsed: options.modelUsed,
  };
}

export function mockProviderTimeout(): MockProviderResponse {
  throw new Error('Request timeout after 30000ms');
}

export function mockProviderAuthError(message: string = 'Authentication failed'): MockProviderResponse {
  const error = new Error(message) as any;
  error.status = 401;
  throw error;
}

export function mockProviderRateLimitError(message: string = 'Rate limit exceeded'): MockProviderResponse {
  const error = new Error(message) as any;
  error.status = 429;
  throw error;
}

export function mockProviderModelNotFoundError(model: string): MockProviderResponse {
  const error = new Error(`Model ${model} not found`) as any;
  error.status = 404;
  throw error;
}

export function mockProviderAPIKeyExpiredError(provider: string): MockProviderResponse {
  const error = new Error(`API key for ${provider} has expired`) as any;
  error.status = 401;
  error.type = 'api_key_expired';
  throw error;
}

export function mockProviderNetworkError(message: string = 'Network error'): MockProviderResponse {
  const error = new Error(message) as any;
  error.code = 'ECONNREFUSED';
  throw error;
}

export function mockProviderAPIError(message: string = 'API error'): MockProviderResponse {
  const error = new Error(message) as any;
  error.status = 500;
  throw error;
}

// ============================================
// Conversation History Factory
// ============================================

export function createConversationHistory(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): AIMessage[] {
  return messages.map((msg, index) => ({
    role: msg.role,
    content: msg.content,
    agentId: 'test-agent',
    id: `msg-${Date.now()}-${index}`,
    timestamp: new Date(),
  }));
}

export const EMPTY_CONVERSATION: AIMessage[] = [];

// ============================================
// Mock API Request Factory
// ============================================

export function createAIRequestBody(options: {
  agentId: string;
  message: string;
  conversationHistory?: AIMessage[];
} = { agentId: 'fast-chat-agent', message: 'Hello!' }): any {
  return {
    agentId: options.agentId,
    message: options.message,
    conversationHistory: options.conversationHistory?.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };
}

// ============================================
// Async Utilities
// ============================================

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForQueueProcessing(
  checkInterval: number = 100,
  maxWait: number = 10000
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    await wait(checkInterval);
  }
}

export function measureExecutionTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    Promise.resolve(fn()).then((result) => {
      resolve({ result, duration: Date.now() - start });
    });
  });
}

// ============================================
// Assertion Helpers
// ============================================

export function assertUsageTracking(
  logModelUsageSpy: jest.SpyInstance,
  expected: {
    provider?: string;
    status?: 'success' | 'failed' | 'fallback';
    agentId?: string;
    callCount?: number;
  }
): void {
  if (expected.callCount !== undefined) {
    expect(logModelUsageSpy).toHaveBeenCalledTimes(expected.callCount);
  }

  if (expected.provider) {
    const calls = logModelUsageSpy.mock.calls;
    const providerCalls = calls.filter(
      (call) => call[0]?.provider === expected.provider
    );
    expect(providerCalls.length).toBeGreaterThan(0);
  }

  if (expected.status) {
    const calls = logModelUsageSpy.mock.calls;
    const statusCalls = calls.filter(
      (call) => call[0]?.status === expected.status
    );
    expect(statusCalls.length).toBeGreaterThan(0);
  }

  if (expected.agentId) {
    const calls = logModelUsageSpy.mock.calls;
    const agentCalls = calls.filter(
      (call) => call[0]?.agent_id === expected.agentId
    );
    expect(agentCalls.length).toBeGreaterThan(0);
  }
}

export function assertErrorLogContains(
  errorLog: Array<{ provider: string; error: string; errorType?: string }>,
  expectedProvider: string
): void {
  const providerErrors = errorLog.filter((e) => e.provider === expectedProvider);
  expect(providerErrors.length).toBeGreaterThan(0);
}

export function assertErrorType(
  errorLog: Array<{ errorType?: string }>,
  expectedType: string
): void {
  const typedErrors = errorLog.filter((e) => e.errorType === expectedType);
  expect(typedErrors.length).toBeGreaterThan(0);
}

export function assertWithinBounds(
  value: number,
  min: number,
  max: number,
  message?: string
): void {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

// ============================================
// Cost Calculation Helpers
// ============================================

export function calculateOpenAICost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 5, output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  };

  const modelPricing = pricing[model.toLowerCase()];
  if (!modelPricing) return 0;

  const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
  const outputCost = (completionTokens / 1_000_000) * modelPricing.output;
  return inputCost + outputCost;
}

// ============================================
// Mock Helper for Jest
// ============================================

export function createMockModule<T>(modulePath: string): jest.Mocked<T> {
  return jest.mock(modulePath, () => ({})) as unknown as jest.Mocked<T>;
}

export function spyOnModule<T>(
  modulePath: string,
  functionName: string
): jest.SpyInstance {
  const module = require(modulePath);
  return jest.spyOn(module, functionName);
}

// ============================================
// Test Message Constants
// ============================================

export const TEST_MESSAGES = {
  simple: 'What is 2 + 2?',
  codeRequest: 'Write a React component that displays a button',
  analysisRequest: 'Analyze the following data trends...',
  creativeRequest: 'Write a short story about a robot.',
};

export const TEST_RESPONSES = {
  simple: '2 + 2 equals 4.',
  code: '```tsx\nexport function Button({ onClick, children }) {\n  return <button onClick={onClick}>{children}</button>;\n}\n```',
  analysis: 'Based on the data trends, I can identify several key patterns...',
  creative: 'In a world where robots had just begun to dream...',
};
