/**
 * MCP Integration Utilities
 * 
 * Helper functions to easily integrate MCP tools into existing agents
 */

import { routeMCPRequest } from "../../server-lib/mcp-router-agent";
import { MCPRouterRequest, MCPIntentType, MCPRouterResponse } from "../../shared/models/mcp-types";

/**
 * Simple MCP tool executor for agents
 */
export async function executeMCPForAgent(
  query: string,
  intent: MCPIntentType = MCPIntentType.GENERAL_QUERY,
  userId: string = "agent-user"
): Promise<MCPRouterResponse | null> {
  try {
    const request: MCPRouterRequest = {
      query,
      userId,
      context: { intent },
      preferences: {
        maxTools: 2,
        enableOrchestration: intent === MCPIntentType.HYBRID_RESEARCH
      }
    };

    return await routeMCPRequest(request);
  } catch (error) {
    console.warn(`MCP execution failed for query: "${query}"`, error);
    return null;
  }
}

/**
 * Pre-built MCP integrations for common agent tasks
 */
export const MCPIntegrations = {
  /**
   * Research competitor websites and market trends
   */
  async researchCompetitors(topic: string, targetAudience: string): Promise<any> {
    const query = `Research competitors and market analysis for "${topic}" targeting "${targetAudience}"`;
    const result = await executeMCPForAgent(query, MCPIntentType.WEB_SCRAPING);
    
    if (!result?.executionResults.some(r => r.success)) {
      return { competitors: [], marketInsights: [] };
    }

    return {
      competitors: result.executionResults
        .filter(r => r.success)
        .map(r => ({
          source: `${r.toolRoute.serverName}.${r.toolRoute.toolName}`,
          data: r.result
        })),
      marketInsights: result.executionResults
        .filter(r => r.success && r.result?.insights)
        .flatMap(r => r.result.insights || [])
    };
  },

  /**
   * Validate facts and claims in content
   */
  async factCheckContent(content: string, topic: string): Promise<any> {
    const query = `Fact-check this content about "${topic}": ${content.substring(0, 500)}...`;
    const result = await executeMCPForAgent(query, MCPIntentType.DOCUMENTATION_SEARCH);
    
    return result?.executionResults
      .filter(r => r.success)
      .map(r => ({
        source: `${r.toolRoute.serverName}.${r.toolRoute.toolName}`,
        verifiedFacts: r.result?.verified || [],
        disputedClaims: r.result?.disputed || []
      })) || [];
  },

  /**
   * Gather current trends and news
   */
  async gatherTrends(topic: string): Promise<any> {
    const query = `Find current trends, news, and developments in "${topic}"`;
    const result = await executeMCPForAgent(query, MCPIntentType.HYBRID_RESEARCH);
    
    return result?.executionResults
      .filter(r => r.success)
      .map(r => ({
        source: `${r.toolRoute.serverName}.${r.toolRoute.toolName}`,
        trends: r.result?.trends || [],
        sources: r.result?.sources || []
      })) || [];
  },

  /**
   * Analyze SEO and content quality
   */
  async analyzeContentQuality(content: string, keywords: string[]): Promise<any> {
    const query = `Analyze SEO and content quality for: ${content.substring(0, 300)}... Keywords: ${keywords.join(', ')}`;
    const result = await executeMCPForAgent(query, MCPIntentType.DOCUMENTATION_SEARCH);
    
    return result?.executionResults
      .filter(r => r.success)
      .map(r => ({
        seoScore: r.result?.seoScore || 0,
        readability: r.result?.readability || {},
        suggestions: r.result?.suggestions || []
      })) || [];
  }
};

/**
 * Enhanced agent wrapper that automatically adds MCP capabilities
 */
export function withMCPIntegration<T extends (...args: any[]) => Promise<any>>(
  agentFunction: T,
  mcpCapabilities: {
    research?: boolean;
    factCheck?: boolean;
    trends?: boolean;
  } = {}
) {
  return async function(...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    // Execute original agent function
    const result = await agentFunction(...args);
    
    // Add MCP enhancements based on capabilities
    const enhancements: any = {};
    
    if (mcpCapabilities.research && result.topic) {
      enhancements.competitorResearch = await MCPIntegrations.researchCompetitors(
        result.topic, 
        result.targetAudience || ''
      );
    }
    
    if (mcpCapabilities.factCheck && result.content) {
      enhancements.factCheck = await MCPIntegrations.factCheckContent(
        result.content, 
        result.topic || ''
      );
    }
    
    if (mcpCapabilities.trends && result.topic) {
      enhancements.trends = await MCPIntegrations.gatherTrends(result.topic);
    }
    
    // Merge enhancements with result
    return {
      ...result,
      mcpEnhancements: enhancements
    };
  };
}

/**
 * Quick MCP tool access for simple use cases
 */
export const QuickMCP = {
  /**
   * Search documentation and guides
   */
  async searchDocs(query: string) {
    return executeMCPForAgent(`Search documentation: ${query}`, MCPIntentType.DOCUMENTATION_SEARCH);
  },

  /**
   * Scrape website content
   */
  async scrapeWebsite(url: string) {
    return executeMCPForAgent(`Scrape content from ${url}`, MCPIntentType.WEB_SCRAPING);
  },

  /**
   * Take browser screenshots
   */
  async takeScreenshot(url: string) {
    return executeMCPForAgent(`Take screenshot of ${url}`, MCPIntentType.BROWSER_AUTOMATION);
  },

  /**
   * Multi-step research workflow
   */
  async researchWorkflow(topic: string, steps: string[]) {
    const query = `Research "${topic}" following these steps: ${steps.join(', ')}`;
    return executeMCPForAgent(query, MCPIntentType.HYBRID_RESEARCH);
  }
};

// Export types for convenience
export type { MCPRouterResponse, MCPIntentType };