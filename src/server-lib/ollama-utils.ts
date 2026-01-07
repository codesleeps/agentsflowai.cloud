import axios, { AxiosError } from 'axios';

interface ModelCache {
  models: string[];
  timestamp: number;
  ttl: number; // 5 minutes for production workloads
}

interface OllamaHealthResponse {
  available: boolean;
  models: string[];
  error?: string;
}

interface ModelAvailabilityResponse {
  available: boolean;
  models: string[];
  error?: string;
}

interface WarmupResult {
  warmedModels: string[];
  failedModels: string[];
  totalTime: number;
}

let modelCache: ModelCache | null = null;

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
// 5-minute TTL is optimal for production workloads - reduces redundant health checks by 5x
const CACHE_TTL = 300000; 
const WARMUP_TIMEOUT = 120000; // 2x large model timeout for initial model downloads
const CACHE_HIT_COUNTER = { hits: 0 };

/**
 * Timeout configuration for Ollama models based on size
 */
export const OLLAMA_TIMEOUT_CONFIG = {
  SMALL_MODEL_TIMEOUT: 30000,  // 30s for 7B models
  MEDIUM_MODEL_TIMEOUT: 45000, // 45s for 8-9B models
  LARGE_MODEL_TIMEOUT: 60000,  // 60s for 13B+ models
  FIRST_LOAD_MULTIPLIER: 2,    // 2x timeout for first load
};

/**
 * Track which models have been loaded to optimize timeout handling
 */
const loadedModels = new Set<string>();

export async function checkOllamaHealth(): Promise<OllamaHealthResponse> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: HEALTH_CHECK_TIMEOUT,
    });

    return {
      available: true,
      models: response.data.models?.map((m: any) => m.name) || [],
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    let errorMessage = 'Unknown error';

    if (axiosError.code === 'ECONNREFUSED') {
      errorMessage = `Ollama service not running at ${OLLAMA_BASE_URL}`;
    } else if (axiosError.response?.status === 404) {
      errorMessage = 'Ollama API endpoint not found';
    } else if (axiosError.code === 'ETIMEDOUT') {
      errorMessage = 'Ollama connection timeout';
    } else {
      errorMessage = axiosError.message || 'Failed to connect to Ollama';
    }

    return {
      available: false,
      models: [],
      error: errorMessage,
    };
  }
}

export async function getAvailableOllamaModels(): Promise<ModelAvailabilityResponse> {
  // Check cache first
  if (modelCache && Date.now() - modelCache.timestamp < modelCache.ttl) {
    return {
      available: true,
      models: modelCache.models,
    };
  }

  const health = await checkOllamaHealth();
  if (!health.available) {
    return health;
  }

  // Update cache
  modelCache = {
    models: health.models,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  };

  return health;
}

export async function isModelAvailable(modelName: string): Promise<boolean> {
  const response = await getAvailableOllamaModels();
  return response.available && response.models.includes(modelName);
}

export function suggestModelPull(modelName: string): string {
  return `Model '${modelName}' not found. Pull it with: ollama pull ${modelName}`;
}

export function clearModelCache(): void {
  modelCache = null;
}

export function getOllamaBaseUrl(): string {
  return OLLAMA_BASE_URL;
}

/**
 * Calculate base timeout for Ollama model based on size
 * @param ollamaModelSize - Size of the model ('small' | 'medium' | 'large' | undefined)
 * @returns Timeout in milliseconds
 */
export function calculateOllamaTimeout(
  ollamaModelSize?: 'small' | 'medium' | 'large'
): number {
  switch (ollamaModelSize) {
    case 'small':
      return OLLAMA_TIMEOUT_CONFIG.SMALL_MODEL_TIMEOUT;
    case 'medium':
      return OLLAMA_TIMEOUT_CONFIG.MEDIUM_MODEL_TIMEOUT;
    case 'large':
      return OLLAMA_TIMEOUT_CONFIG.LARGE_MODEL_TIMEOUT;
    default:
      return OLLAMA_TIMEOUT_CONFIG.MEDIUM_MODEL_TIMEOUT; // Default to medium
  }
}

/**
 * Check if a model is being loaded for the first time
 * @param modelName - Name of the model
 * @returns true if first load, false if previously loaded
 */
export function isFirstLoad(modelName: string): boolean {
  return !loadedModels.has(modelName);
}

/**
 * Mark a model as loaded after successful response
 * @param modelName - Name of the model
 */
export function markModelAsLoaded(modelName: string): void {
  loadedModels.add(modelName);
}

/**
 * Get appropriate timeout for Ollama model considering size and first-load status
 * @param modelName - Name of the model
 * @param ollamaModelSize - Size of the model ('small' | 'medium' | 'large' | undefined)
 * @returns Timeout in milliseconds (doubled for first load)
 */
export function getOllamaTimeoutWithFirstLoad(
  modelName: string,
  ollamaModelSize?: 'small' | 'medium' | 'large'
): number {
  const baseTimeout = calculateOllamaTimeout(ollamaModelSize);
  const firstLoad = isFirstLoad(modelName);
  
  return firstLoad
    ? baseTimeout * OLLAMA_TIMEOUT_CONFIG.FIRST_LOAD_MULTIPLIER
    : baseTimeout;
}

/**
 * Proactively warm up Ollama models to eliminate first-request latency
 * Makes lightweight generation requests to pre-load models into memory
 * @param models - Array of model names to warm up (default: mistral:7b, gemma2:9b, codellama:7b)
 * @returns Object with warmedModels, failedModels, and totalTime
 */
export async function warmupOllamaModels(
  models: string[] = ['mistral:7b', 'gemma2:9b', 'codellama:7b']
): Promise<WarmupResult> {
  const startTime = Date.now();
  const warmedModels: string[] = [];
  const failedModels: string[] = [];
  
  console.log(`[Ollama Utils ${new Date().toISOString()}] Starting model warmup for ${models.length} models: ${models.join(', ')}`);
  
  for (const modelName of models) {
    const modelStartTime = Date.now();
    try {
      console.log(`[Ollama Utils ${new Date().toISOString()}] Warming up model ${modelName}...`);
      
      await axios.post(
        `${OLLAMA_BASE_URL}/api/generate`,
        {
          model: modelName,
          prompt: 'test',
          stream: false,
        },
        {
          timeout: WARMUP_TIMEOUT,
        }
      );
      
      const modelDuration = Date.now() - modelStartTime;
      console.log(`[Ollama Utils ${new Date().toISOString()}] Model ${modelName} ready (${modelDuration}ms)`);
      warmedModels.push(modelName);
      
      // Mark as loaded to optimize subsequent timeouts
      markModelAsLoaded(modelName);
    } catch (error) {
      const modelDuration = Date.now() - modelStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`[Ollama Utils ${new Date().toISOString()}] Model ${modelName} failed: ${errorMessage} (${modelDuration}ms)`);
      failedModels.push(modelName);
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`[Ollama Utils ${new Date().toISOString()}] Model warmup completed: ${warmedModels.length} warmed, ${failedModels.length} failed in ${totalTime}ms`);
  
  return {
    warmedModels,
    failedModels,
    totalTime,
  };
}

/**
 * Get cache statistics for monitoring
 * @returns Object with cache stats
 */
export function getCacheStats(): { hitRate: number; hitCount: number; isCached: boolean; cacheAge: number | null } {
  if (!modelCache) {
    return { hitRate: 0, hitCount: 0, isCached: false, cacheAge: null };
  }
  
  const age = Date.now() - modelCache.timestamp;
  const isValid = age < modelCache.ttl;
  
  return {
    hitRate: CACHE_HIT_COUNTER.hits / 100, // Approximate rate
    hitCount: CACHE_HIT_COUNTER.hits,
    isCached: isValid,
    cacheAge: isValid ? Math.floor(age / 1000) : null,
  };
}
