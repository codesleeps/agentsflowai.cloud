import { apiClient } from './api-client';
import useSWR from 'swr';
import type { AIAgent, OllamaModel } from '@/shared/models/ai-agents';

const fetcher = <T>(url: string) => apiClient.get<T>(url).then((res) => res.data);

// Get Ollama connection status
export function useOllamaStatus() {
  return useSWR<{
    status: 'connected' | 'disconnected';
    ollamaUrl: string;
    models?: OllamaModel[];
    error?: string;
  }>('/ai/ollama', fetcher, {
    refreshInterval: 30000, // Check every 30 seconds
    revalidateOnFocus: true,
  });
}

// Get all AI agents
export function useAIAgents() {
  return useSWR<AIAgent[]>('/ai/agents', fetcher);
}

// Generate response from an agent
export async function generateAgentResponse(
  agentId: string,
  message: string,
  conversationHistory: { role: string; content: string }[] = []
) {
  const response = await apiClient.post<{
    response: string;
    model: string;
    agentId: string;
    agentName: string;
    tokensUsed?: number;
    generationTime?: number;
    note?: string;
  }>('/ai/agents', {
    agentId,
    message,
    conversationHistory,
  });
  
  return response.data;
}

// Direct Ollama generation
export async function generateWithOllama(
  prompt: string,
  options?: {
    model?: string;
    system?: string;
    temperature?: number;
  }
) {
  const response = await apiClient.post('/ai/ollama', {
    action: 'generate',
    model: options?.model || 'mistral',
    prompt,
    system: options?.system,
    options: {
      temperature: options?.temperature || 0.7,
    },
  });
  
  return response.data;
}

// Chat with Ollama
export async function chatWithOllama(
  messages: { role: string; content: string }[],
  options?: {
    model?: string;
    temperature?: number;
  }
) {
  const response = await apiClient.post('/ai/ollama', {
    action: 'chat',
    model: options?.model || 'mistral',
    messages,
    options: {
      temperature: options?.temperature || 0.7,
    },
  });
  
  return response.data;
}

// List available models
export async function listOllamaModels() {
  const response = await apiClient.post('/ai/ollama', {
    action: 'models',
  });
  
  return response.data;
}

// Pull a new model
export async function pullOllamaModel(modelName: string) {
  const response = await apiClient.post('/ai/ollama', {
    action: 'pull',
    name: modelName,
  });
  
  return response.data;
}

// Specialized content generation functions
export async function generateBlogPost(
  topic: string,
  options?: {
    tone?: string;
    length?: 'short' | 'medium' | 'long';
    keywords?: string[];
    targetAudience?: string;
  }
) {
  const prompt = `Write a ${options?.length || 'medium'}-length blog post about "${topic}".
${options?.tone ? `Tone: ${options.tone}` : ''}
${options?.keywords?.length ? `Keywords to include: ${options.keywords.join(', ')}` : ''}
${options?.targetAudience ? `Target audience: ${options.targetAudience}` : ''}

Include:
- Engaging headline
- Introduction with hook
- Main content with subheadings
- Conclusion with call-to-action
- SEO-optimized structure`;

  return generateAgentResponse('content-agent', prompt);
}

export async function generateSocialPost(
  topic: string,
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook'
) {
  const platformGuides: Record<string, string> = {
    twitter: 'Keep under 280 characters. Use 1-2 hashtags. Make it punchy and engaging.',
    linkedin: 'Professional tone. Use line breaks for readability. Include a call-to-action.',
    instagram: 'Engaging caption. Use 5-10 relevant hashtags. Include emoji.',
    facebook: 'Conversational tone. Ask a question. Encourage comments.',
  };

  const prompt = `Create a ${platform} post about: "${topic}"

Platform guidelines: ${platformGuides[platform]}

Include appropriate hashtags and formatting for ${platform}.`;

  return generateAgentResponse('social-media-agent', prompt);
}

export async function generateAdCopy(
  product: string,
  objective: 'awareness' | 'consideration' | 'conversion',
  platform: string
) {
  const prompt = `Create ad copy for: "${product}"

Objective: ${objective}
Platform: ${platform}

Include:
- Headline (attention-grabbing)
- Primary text (value proposition)
- Call-to-action
- Optional: variations for A/B testing`;

  return generateAgentResponse('marketing-agent', prompt);
}

export async function analyzeSEO(content: string, targetKeywords: string[]) {
  const prompt = `Analyze this content for SEO optimization:

Content:
${content.substring(0, 2000)}...

Target keywords: ${targetKeywords.join(', ')}

Provide:
1. SEO score (0-100)
2. Keyword density analysis
3. Meta tag suggestions
4. Content improvement recommendations
5. Technical SEO tips`;

  return generateAgentResponse('seo-agent', prompt);
}

export async function generateCode(
  description: string,
  language: string = 'typescript',
  framework?: string
) {
  const prompt = `Generate ${language}${framework ? ` (${framework})` : ''} code for:

${description}

Requirements:
- Clean, readable code
- Proper error handling
- Type safety (if applicable)
- Follow best practices
- Include comments explaining complex logic`;

  return generateAgentResponse('web-dev-agent', prompt);
}

export async function analyzeData(
  dataDescription: string,
  analysisGoal: string
) {
  const prompt = `Analyze the following data scenario:

Data: ${dataDescription}
Goal: ${analysisGoal}

Provide:
1. Key metrics to track
2. Potential insights
3. Trends to monitor
4. Actionable recommendations
5. Visualization suggestions`;

  return generateAgentResponse('analytics-agent', prompt);
}
