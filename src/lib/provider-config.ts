import { getEnv } from "./env-validation";

export type AIProvider = 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'moonshot' | 'deepseek' | 'google';

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
    case 'moonshot':
      return !!env.MOONSHOT_API_KEY;
    case 'deepseek':
      return !!env.DEEPSEEK_API_KEY;
    case 'google':
      return !!env.GOOGLE_API_KEY;
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
    case 'moonshot':
      return env.MOONSHOT_API_KEY;
    case 'deepseek':
      return env.DEEPSEEK_API_KEY;
    case 'google':
      return env.GOOGLE_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Gets a list of all currently configured providers.
 * OpenRouter is prioritized as it provides access to multiple models.
 */
export function getConfiguredProviders(): AIProvider[] {
  // Prioritize OpenRouter first, then others
  const providers: AIProvider[] = ['openrouter', 'openai', 'anthropic', 'ollama', 'moonshot', 'deepseek', 'google'];
  return providers.filter(isProviderConfigured);
}

/**
 * Gets the best available provider for general use.
 * Prefers OpenRouter for its model variety and fallback capabilities.
 */
export function getPreferredProvider(): AIProvider | null {
  const configured = getConfiguredProviders();
  return configured.length > 0 ? configured[0] : null;
}

/**
 * Gets provider priority order for fallback chains.
 * OpenRouter is first as it can route to multiple backends.
 */
export function getProviderPriority(): AIProvider[] {
  return ['openrouter', 'openai', 'anthropic', 'deepseek', 'google', 'moonshot', 'ollama'];
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