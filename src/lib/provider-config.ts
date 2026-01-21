import { getEnv } from "./env-validation";

export type AIProvider = 'openai' | 'anthropic' | 'openrouter' | 'ollama';

/**
 * Checks if a specific AI provider is configured with an API key or URL.
 * This does not check if the provider is online, only if the configuration exists.
 */
export function isProviderConfigured(provider: AIProvider): boolean {
  const env = getEnv();
  switch (provider) {
    case 'openai':
      return !!env.OPENAI_API_KEY;
    case 'anthropic':
      return !!env.ANTHROPIC_API_KEY;
    case 'openrouter':
      return !!env.OPENROUTER_API_KEY;
    case 'ollama':
      // Ollama is considered configured if URL is present (default is set in schema)
      return !!env.OLLAMA_BASE_URL;
    default:
      return false;
  }
}

/**
 * Gets the API key for a specific provider.
 * Returns undefined if not configured.
 */
export function getProviderKey(provider: AIProvider): string | undefined {
  const env = getEnv();
  switch (provider) {
    case 'openai':
      return env.OPENAI_API_KEY;
    case 'anthropic':
      return env.ANTHROPIC_API_KEY;
    case 'openrouter':
      return env.OPENROUTER_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Gets a list of all currently configured providers.
 */
export function getConfiguredProviders(): AIProvider[] {
  const providers: AIProvider[] = ['openai', 'anthropic', 'openrouter', 'ollama'];
  return providers.filter(isProviderConfigured);
}

/**
 * Throws an error if the provider is not configured.
 * Useful for runtime checks in provider handlers.
 */
export function requireProviderConfig(provider: AIProvider): void {
  if (!isProviderConfigured(provider)) {
    throw new Error(`Provider ${provider} is not configured. Please check your environment variables.`);
  }
}