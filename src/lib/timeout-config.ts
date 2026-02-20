/**
 * Timeout Configuration Fix
 * Increases various timeout settings to prevent 504 errors
 */

// Next.js API route timeout configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
    externalResolver: true,
  },
};

// Custom timeout middleware for API routes
export function withTimeout(handler, timeoutMs = 300000) { // 5 minutes default
  return async (req, res) => {
    // Set server response timeout
    req.setTimeout(timeoutMs);
    res.setTimeout(timeoutMs);
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    try {
      // Race between handler and timeout
      await Promise.race([
        handler(req, res),
        timeoutPromise
      ]);
    } catch (error) {
      if (error.message.includes('timeout')) {
        res.status(408).json({
          error: 'Request Timeout',
          message: `The request took longer than ${timeoutMs}ms to complete`,
          timeout: timeoutMs
        });
      } else {
        throw error;
      }
    }
  };
}

// AI Provider timeout configuration
export const AI_TIMEOUTS = {
  // Per-provider timeouts
  ollama: 90000,        // 1.5 minutes (default fallback)
  ollamaSmall: 30000,   // 30 seconds  (small models)
  ollamaMedium: 60000,  // 1 minute    (medium models)
  ollamaLarge: 90000,   // 1.5 minutes (large models)
  openrouter: 60000,    // 1 minute
  anthropic: 180000,    // 3 minutes
  openai: 180000,       // 3 minutes

  // Overall request timeout
  overall: 300000,      // 5 minutes

  // Connection timeouts
  connect: 10000,       // 10 seconds
  read: 300000,         // 5 minutes
};

// Utility function to apply timeouts to fetch requests
export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Fetch timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Example usage in API routes:
/*
import { withTimeout, AI_TIMEOUTS } from '@/lib/timeout-config';

export default withTimeout(async function handler(req, res) {
  // Your AI processing logic here
  // Use AI_TIMEOUTS.ollama, AI_TIMEOUTS.openrouter, etc.
}, AI_TIMEOUTS.overall);
*/