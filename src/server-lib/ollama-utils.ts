import axios, { AxiosError } from 'axios';

interface ModelCache {
  models: string[];
  timestamp: number;
  ttl: number; // 60 seconds
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

let modelCache: ModelCache | null = null;

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const CACHE_TTL = 60000; // 60 seconds

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
