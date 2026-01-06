/**
 * Startup API Key Validation Module
 * 
 * Performs lightweight API key validation at application startup without making
 * expensive generation requests. Validates each configured provider and logs
 * warnings for expired, invalid, or missing keys.
 */

import { checkOllamaHealth } from '../server-lib/ollama-utils';

export interface ProviderValidationResult {
  provider: string;
  status: 'valid' | 'expired' | 'invalid' | 'missing' | 'unreachable';
  message?: string;
  renewalUrl?: string;
  envVarName?: string;
  lastChecked: Date;
}

const VALIDATION_RESULTS_CACHE: Map<string, ProviderValidationResult> = new Map();

/**
 * Check Google API Key validity with a lightweight request
 */
async function checkGoogleApiKey(): Promise<ProviderValidationResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const provider = 'Google';
  const renewalUrl = 'https://makersuite.google.com/app/apikey';
  const envVarName = 'GOOGLE_API_KEY';

  if (!apiKey) {
    return {
      provider,
      status: 'missing',
      message: 'API key not configured',
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  }

  try {
    // Use the models list endpoint as a lightweight validation check
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (response.ok) {
      return {
        provider,
        status: 'valid',
        message: 'API key is valid',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    const errorText = await response.text();
    
    if (response.status === 400 && (errorText.includes('API_KEY_INVALID') || errorText.includes('expired'))) {
      return {
        provider,
        status: 'expired',
        message: 'API key has expired',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        provider,
        status: 'invalid',
        message: 'API key is invalid or unauthorized',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    return {
      provider,
      status: 'invalid',
      message: `Unexpected response: ${response.status}`,
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          provider,
          status: 'unreachable',
          message: 'Request timeout - service may be unreachable',
          renewalUrl,
          envVarName,
          lastChecked: new Date(),
        };
      }
      
      return {
        provider,
        status: 'unreachable',
        message: `Network error: ${error.message}`,
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    return {
      provider,
      status: 'unreachable',
      message: 'Unknown error during validation',
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  }
}

/**
 * Check OpenRouter API Key validity
 */
async function checkOpenRouterApiKey(): Promise<ProviderValidationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const provider = 'OpenRouter';
  const renewalUrl = 'https://openrouter.ai/keys';
  const envVarName = 'OPENROUTER_API_KEY';

  if (!apiKey) {
    return {
      provider,
      status: 'missing',
      message: 'API key not configured',
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  }

  try {
    // Use the models endpoint as a lightweight validation check
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return {
        provider,
        status: 'valid',
        message: 'API key is valid',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    const errorText = await response.text();
    
    if (errorText.includes('expired') || errorText.includes('invalid')) {
      return {
        provider,
        status: errorText.includes('expired') ? 'expired' : 'invalid',
        message: 'API key has expired or is invalid',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        provider,
        status: 'invalid',
        message: 'API key is invalid or unauthorized',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    return {
      provider,
      status: 'invalid',
      message: `Unexpected response: ${response.status}`,
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          provider,
          status: 'unreachable',
          message: 'Request timeout - service may be unreachable',
          renewalUrl,
          envVarName,
          lastChecked: new Date(),
        };
      }
      
      return {
        provider,
        status: 'unreachable',
        message: `Network error: ${error.message}`,
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    return {
      provider,
      status: 'unreachable',
      message: 'Unknown error during validation',
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  }
}

/**
 * Check Anthropic API Key validity
 */
async function checkAnthropicApiKey(): Promise<ProviderValidationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const provider = 'Anthropic';
  const renewalUrl = 'https://console.anthropic.com/';
  const envVarName = 'ANTHROPIC_API_KEY';

  if (!apiKey) {
    return {
      provider,
      status: 'missing',
      message: 'API key not configured',
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  }

  try {
    // Use a minimal request to validate the key
    // Note: Anthropic doesn't have a simple list models endpoint, so we'll use a minimal message request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
      signal: AbortSignal.timeout(5000),
    });

    // Even if the request fails for other reasons (like invalid format),
    // we can tell if the API key is valid based on the error
    const responseText = await response.text();
    
    if (response.ok) {
      return {
        provider,
        status: 'valid',
        message: 'API key is valid',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    if (responseText.includes('authentication') || responseText.includes('api_key')) {
      return {
        provider,
        status: 'invalid',
        message: 'API key is invalid',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        provider,
        status: 'invalid',
        message: 'API key is invalid or unauthorized',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    // If we get a different error, the key is likely valid (just the request format might be wrong)
    // This is acceptable for a lightweight check
    return {
      provider,
      status: 'valid',
      message: 'API key appears to be valid',
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          provider,
          status: 'unreachable',
          message: 'Request timeout - service may be unreachable',
          renewalUrl,
          envVarName,
          lastChecked: new Date(),
        };
      }
      
      return {
        provider,
        status: 'unreachable',
        message: `Network error: ${error.message}`,
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    return {
      provider,
      status: 'unreachable',
      message: 'Unknown error during validation',
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  }
}

/**
 * Check OpenAI API Key validity
 */
async function checkOpenAIApiKey(): Promise<ProviderValidationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const provider = 'OpenAI';
  const renewalUrl = 'https://platform.openai.com/api-keys';
  const envVarName = 'OPENAI_API_KEY';

  if (!apiKey) {
    return {
      provider,
      status: 'missing',
      message: 'API key not configured',
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  }

  try {
    // Use the models list endpoint as a lightweight validation check
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return {
        provider,
        status: 'valid',
        message: 'API key is valid',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    const errorText = await response.text();
    
    if (errorText.includes('expired')) {
      return {
        provider,
        status: 'expired',
        message: 'API key has expired',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        provider,
        status: 'invalid',
        message: 'API key is invalid or unauthorized',
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    return {
      provider,
      status: 'invalid',
      message: `Unexpected response: ${response.status}`,
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          provider,
          status: 'unreachable',
          message: 'Request timeout - service may be unreachable',
          renewalUrl,
          envVarName,
          lastChecked: new Date(),
        };
      }
      
      return {
        provider,
        status: 'unreachable',
        message: `Network error: ${error.message}`,
        renewalUrl,
        envVarName,
        lastChecked: new Date(),
      };
    }

    return {
      provider,
      status: 'unreachable',
      message: 'Unknown error during validation',
      renewalUrl,
      envVarName,
      lastChecked: new Date(),
    };
  }
}

/**
 * Check Ollama health (reuses existing function)
 */
async function checkOllamaHealthWrapper(): Promise<ProviderValidationResult> {
  const provider = 'Ollama';
  const envVarName = 'OLLAMA_BASE_URL';

  try {
    const health = await checkOllamaHealth();
    
    if (health.available) {
      return {
        provider,
        status: 'valid',
        message: 'Ollama is running and healthy',
        envVarName,
        lastChecked: new Date(),
      };
    }

    return {
      provider,
      status: 'unreachable',
      message: health.error || 'Ollama service is not healthy',
      envVarName,
      lastChecked: new Date(),
    };
  } catch (error) {
    return {
      provider,
      status: 'unreachable',
      message: error instanceof Error ? error.message : 'Unknown error',
      envVarName,
      lastChecked: new Date(),
    };
  }
}

/**
 * Log validation result with formatted output
 */
function logValidationResult(result: ProviderValidationResult): void {
  const statusEmoji = {
    valid: '✅',
    expired: '⚠️ ',
    invalid: '⚠️ ',
    missing: 'ℹ️ ',
    unreachable: '⚠️ ',
  };

  const emoji = statusEmoji[result.status];
  
  if (result.status === 'valid') {
    console.log(`${emoji} [Startup Validation] ${result.provider}: ${result.status.toUpperCase()}`);
    return;
  }

  console.warn(`\n${emoji} [Startup Validation] ${result.provider} API Key: ${result.status.toUpperCase()}`);
  
  if (result.message) {
    console.warn(`    → Status: ${result.message}`);
  }
  
  if (result.renewalUrl) {
    console.warn(`    → Renew at: ${result.renewalUrl}`);
  }
  
  if (result.envVarName) {
    console.warn(`    → Update environment variable: ${result.envVarName}`);
  }
  
  if (result.status === 'expired' || result.status === 'invalid' || result.status === 'missing') {
    console.warn(`    → Current status: All ${result.provider} models unavailable`);
  }
  
  console.warn('');
}

/**
 * Validate all configured provider API keys
 */
export async function validateProviderKeys(): Promise<void> {
  console.log('\n🔍 [Startup Validation] Checking API provider configurations...\n');

  const validationTasks = [
    checkGoogleApiKey(),
    checkOpenRouterApiKey(),
    checkAnthropicApiKey(),
    checkOpenAIApiKey(),
    checkOllamaHealthWrapper(),
  ];

  const results = await Promise.all(validationTasks);

  // Cache all results
  results.forEach(result => {
    VALIDATION_RESULTS_CACHE.set(result.provider, result);
    logValidationResult(result);
  });

  // Summary
  const validCount = results.filter(r => r.status === 'valid').length;
  const totalCount = results.length;

  if (validCount === totalCount) {
    console.log(`✅ [Startup Validation] All ${totalCount} providers configured and validated\n`);
  } else if (validCount === 0) {
    console.warn(`⚠️  [Startup Validation] No providers are currently available (0/${totalCount})\n`);
  } else {
    console.warn(`⚠️  [Startup Validation] ${validCount}/${totalCount} providers available\n`);
  }
}

/**
 * Get cached provider validation status
 */
export function getProviderStatus(provider: string): ProviderValidationResult | undefined {
  return VALIDATION_RESULTS_CACHE.get(provider);
}

/**
 * Get all cached provider statuses
 */
export function getAllProviderStatuses(): Map<string, ProviderValidationResult> {
  return new Map(VALIDATION_RESULTS_CACHE);
}
