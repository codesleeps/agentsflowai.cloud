import { z } from 'zod';

// Core Router Types
export interface MCPRouterRequest {
  query: string;
  userId: string;
  context?: Record<string, any>;
  preferences?: {
    maxTools?: number;
    timeout?: number;
    enableOrchestration?: boolean;
  };
}

export interface MCPRouterResponse {
  intent: MCPIntentClassification;
  selectedTools: MCPToolRoute[];
  executionResults: MCPToolExecutionResult[];
  confidence: number;
  fallbackUsed: boolean;
  totalCost: number;
  executionTime: number;
  error?: string;
}

export interface MCPIntentClassification {
  intent: MCPIntentType;
  confidence: number;
  suggestedParameters?: Record<string, any>;
  reasoning?: string;
}

export interface MCPToolRoute {
  serverName: string;
  toolName: string;
  parameters?: Record<string, any>;
  priority: number;
  conditions?: {
    healthCheck?: boolean;
    rateLimit?: boolean;
    costLimit?: number;
  };
}

export interface MCPOrchestrationPipeline {
  name: string;
  steps: MCPOrchestrationStep[];
  dataFlow?: MCPDataFlow[];
}

export interface MCPOrchestrationStep {
  tool: string; // Format: "serverName.toolName"
  input: string; // Data path or static value
  output: string; // Output variable name
  timeout?: number;
  retryCount?: number;
}

export interface MCPDataFlow {
  from: string; // Output variable name
  to: string; // Input variable name
  transform?: string; // Optional transformation function
}

export interface MCPToolExecutionResult {
  toolRoute: MCPToolRoute;
  success: boolean;
  result?: any;
  error?: string;
  cost: number;
  executionTime: number;
  retryCount: number;
}

// Intent Types Enum
export enum MCPIntentType {
  DOCUMENTATION_SEARCH = 'DOCUMENTATION_SEARCH',
  WEB_SCRAPING = 'WEB_SCRAPING',
  BROWSER_AUTOMATION = 'BROWSER_AUTOMATION',
  HYBRID_RESEARCH = 'HYBRID_RESEARCH',
  GENERAL_QUERY = 'GENERAL_QUERY'
}

// Routing Configuration Types
export interface MCPRoutingRule {
  intent: MCPIntentType;
  patterns: string[]; // Regex patterns or keywords
  priority: number;
  conditions?: {
    confidenceThreshold?: number;
    availableTools?: string[];
  };
}

export interface MCPToolChain {
  name: string;
  tools: MCPToolRoute[];
  executionOrder: 'parallel' | 'sequential';
  dataDependencies?: MCPDataFlow[];
}

export interface MCPRouterConfig {
  maxToolsPerRequest: number;
  classificationTimeout: number;
  enableOrchestration: boolean;
  fallbackToPatternMatching: boolean;
  cacheClassifications: boolean;
  confidenceThreshold: number;
  defaultTimeout: number;
}

// Zod Schemas for Runtime Validation
export const MCPRouterRequestSchema = z.object({
  query: z.string().min(1),
  userId: z.string().min(1),
  context: z.record(z.string(), z.any()).optional(),
  preferences: z.object({
    maxTools: z.number().min(1).max(10).optional(),
    timeout: z.number().min(1000).max(300000).optional(), // 1s to 5min
    enableOrchestration: z.boolean().optional()
  }).optional()
});

export const MCPIntentClassificationSchema = z.object({
  intent: z.nativeEnum(MCPIntentType),
  confidence: z.number().min(0).max(1),
  suggestedParameters: z.record(z.string(), z.any()).optional(),
  reasoning: z.string().optional()
});

export const MCPToolRouteSchema = z.object({
  serverName: z.string().min(1),
  toolName: z.string().min(1),
  parameters: z.record(z.string(), z.any()).optional(),
  priority: z.number().min(1).max(10),
  conditions: z.object({
    healthCheck: z.boolean().optional(),
    rateLimit: z.boolean().optional(),
    costLimit: z.number().min(0).optional()
  }).optional()
});

// Type Guards
export function isMCPRouterRequest(obj: any): obj is MCPRouterRequest {
  return MCPRouterRequestSchema.safeParse(obj).success;
}

export function isMCPIntentClassification(obj: any): obj is MCPIntentClassification {
  return MCPIntentClassificationSchema.safeParse(obj).success;
}

export function isMCPToolRoute(obj: any): obj is MCPToolRoute {
  return MCPToolRouteSchema.safeParse(obj).success;
}

// Utility Types
export type MCPRouterRequestInput = z.infer<typeof MCPRouterRequestSchema>;
export type MCPIntentClassificationInput = z.infer<typeof MCPIntentClassificationSchema>;
export type MCPToolRouteInput = z.infer<typeof MCPToolRouteSchema>;
