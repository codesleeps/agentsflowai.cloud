# MCP Integration Guide for Agents

This guide shows how to integrate MCP (Model Context Protocol) tools into your existing AI agents to enhance their capabilities.

## Quick Start

### 1. Basic MCP Tool Usage

```typescript
import { QuickMCP } from '@/lib/mcp/agent-integration';

// Simple web research
const research = await QuickMCP.searchDocs('React best practices 2024');

// Scrape website content
const websiteData = await QuickMCP.scrapeWebsite('https://example.com');

// Take screenshots
const screenshot = await QuickMCP.takeScreenshot('https://myapp.com');
```

### 2. Enhanced Agent Pattern

```typescript
import { withMCPIntegration } from '@/lib/mcp/agent-integration';
import { runResearchAgent } from '@/server-lib/marketing-agents';

// Wrap existing agents with MCP capabilities
const enhancedResearchAgent = withMCPIntegration(
  runResearchAgent,
  {
    research: true,  // Adds competitor research
    trends: true,    // Adds trend analysis
    factCheck: true  // Adds fact verification
  }
);

// Use the enhanced agent
const result = await enhancedResearchAgent(campaignId);
```

### 3. Pre-built Integrations

```typescript
import { MCPIntegrations } from '@/lib/mcp/agent-integration';

// Research competitors
const competitors = await MCPIntegrations.researchCompetitors(
  'SaaS pricing strategies',
  'SMB software companies'
);

// Fact-check content
const factCheck = await MCPIntegrations.factCheckContent(
  articleContent,
  'artificial intelligence'
);

// Analyze content quality
const seoAnalysis = await MCPIntegrations.analyzeContentQuality(
  blogPost,
  ['SEO', 'content marketing']
);
```

## Integration Examples

### Marketing Agents Enhancement

```typescript
// Enhanced research agent that automatically analyzes competitors
async function enhancedMarketingResearch(topic: string) {
  // 1. Use MCP to research competitors
  const competitorData = await MCPIntegrations.researchCompetitors(
    topic,
    'digital marketers'
  );
  
  // 2. Gather current trends
  const trends = await MCPIntegrations.gatherTrends(topic);
  
  // 3. Pass enriched data to your existing agent
  const enhancedPrompt = `
    Topic: ${topic}
    
    Competitor Analysis:
    ${JSON.stringify(competitorData.competitors)}
    
    Current Trends:
    ${JSON.stringify(trends)}
  `;
  
  // Call your original agent function
  return await runResearchAgent(enhancedPrompt);
}
```

### Content Creation Enhancement

```typescript
// Content agent that validates facts automatically
async function enhancedContentCreation(topic: string, draft: string) {
  // 1. Fact-check the content
  const factCheck = await MCPIntegrations.factCheckContent(draft, topic);
  
  // 2. Analyze SEO quality
  const seoAnalysis = await MCPIntegrations.analyzeContentQuality(
    draft,
    [topic]
  );
  
  // 3. Generate improved content
  const improvedPrompt = `
    Improve this content based on:
    
    Fact Check Results:
    ${JSON.stringify(factCheck)}
    
    SEO Analysis:
    ${JSON.stringify(seoAnalysis)}
    
    Original Draft:
    ${draft}
  `;
  
  return await generateContent(improvedPrompt);
}
```

## Available MCP Tools

### Context7
- **Purpose**: Documentation and knowledge base search
- **Best for**: Technical research, API documentation, best practices
- **Usage**: `QuickMCP.searchDocs('query')`

### Fetch
- **Purpose**: Web scraping and content extraction
- **Best for**: Gathering data from websites, extracting specific information
- **Usage**: `QuickMCP.scrapeWebsite('https://example.com')`

### Playwright
- **Purpose**: Browser automation and testing
- **Best for**: Taking screenshots, interacting with web pages, testing flows
- **Usage**: `QuickMCP.takeScreenshot('https://app.com')`

## Implementation Patterns

### 1. Research-Augmented Generation
```typescript
async function ragAgent(query: string) {
  // Research first
  const research = await QuickMCP.searchDocs(query);
  
  // Generate with research context
  const prompt = `
    Based on this research: ${JSON.stringify(research)}
    
    Answer: ${query}
  `;
  
  return await generateResponse(prompt);
}
```

### 2. Multi-step Orchestration
```typescript
async function orchestratedAgent(topic: string) {
  // Step 1: Research
  const research = await MCPIntegrations.researchCompetitors(topic, 'target audience');
  
  // Step 2: Trend analysis
  const trends = await MCPIntegrations.gatherTrends(topic);
  
  // Step 3: Content generation
  const content = await generateContent(`
    Topic: ${topic}
    Research: ${JSON.stringify(research)}
    Trends: ${JSON.stringify(trends)}
  `);
  
  // Step 4: Fact-checking
  const factCheck = await MCPIntegrations.factCheckContent(content, topic);
  
  return { content, factCheck, research, trends };
}
```

### 3. Conditional Tool Usage
```typescript
async function smartAgent(query: string, context: any) {
  let enhancedQuery = query;
  
  // Use different tools based on query type
  if (query.includes('competitor') || query.includes('market')) {
    const research = await MCPIntegrations.researchCompetitors(
      query,
      context.audience
    );
    enhancedQuery += `\n\nMarket Research: ${JSON.stringify(research)}`;
  }
  
  if (query.includes('trend') || query.includes('latest')) {
    const trends = await MCPIntegrations.gatherTrends(query);
    enhancedQuery += `\n\nCurrent Trends: ${JSON.stringify(trends)}`;
  }
  
  return await generateResponse(enhancedQuery);
}
```

## Best Practices

1. **Start Simple**: Begin with `QuickMCP` functions for basic integration
2. **Cache Results**: MCP tool results can be expensive - cache when appropriate
3. **Handle Failures**: Always have fallbacks when MCP tools fail
4. **Monitor Costs**: Track usage of paid MCP tools
5. **Validate Output**: MCP tools can return inconsistent data - always validate

## Error Handling

```typescript
async function robustMCPIntegration(query: string) {
  try {
    const result = await QuickMCP.searchDocs(query);
    return result;
  } catch (error) {
    console.warn('MCP tool failed, using fallback:', error);
    // Fallback to regular AI without MCP enhancement
    return await generateResponse(query);
  }
}
```

## Performance Optimization

```typescript
// Batch MCP calls when possible
async function batchResearch(queries: string[]) {
  const promises = queries.map(query => 
    QuickMCP.searchDocs(query)
  );
  
  return await Promise.all(promises);
}

// Use caching for repeated queries
const researchCache = new Map();

async function cachedResearch(query: string) {
  if (researchCache.has(query)) {
    return researchCache.get(query);
  }
  
  const result = await QuickMCP.searchDocs(query);
  researchCache.set(query, result);
  return result;
}
```

This integration approach allows you to enhance your existing agents incrementally while maintaining backward compatibility.