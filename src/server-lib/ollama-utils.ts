import axios, { AxiosError } from "axios";

// ============================================================================
// QUEUE INTERFACES AND TYPES
// ============================================================================

export interface QueuedRequest {
  id: string;
  modelName: string;
  payload: any;
  priority: number;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  abortController: AbortController;
  agentId: string;
  enqueueTime: number;
}

export interface RequestDeduplicationEntry {
  hash: string;
  promise: Promise<any>;
  timestamp: number;
}

export interface ModelRateLimiter {
  modelName: string;
  requestTimestamps: number[];
  maxRequestsPerMinute: number;
}

export interface QueueMetrics {
  queueLength: number;
  activeRequests: number;
  totalProcessed: number;
  totalDeduplicationHits: number;
  averageWaitTimeMs: number;
  totalRequests: number;
  modelStats: Record<string, { queued: number; active: number; rateLimitStatus: string }>;
}

export interface QueueStatus {
  queueLength: number;
  activeRequests: number;
  maxConcurrency: number;
  totalProcessed: number;
  deduplicationHits: number;
  averageWaitTimeMs: number;
  modelStats: Record<string, { queued: number; active: number; rateLimitStatus: string }>;
  timestamp: string;
}

export interface QueueRequestResult {
  requestId: string;
  position: number;
  enqueueTime: number;
  isDedupHit: boolean;
  waitTimeMs: number;
}

// ============================================================================
// PRIORITY ENUM
// ============================================================================

export enum RequestPriority {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

// ============================================================================
// QUEUE CONFIGURATION CONSTANTS
// ============================================================================

export const DEFAULT_MAX_CONCURRENT_REQUESTS = 2;
export const DEFAULT_MAX_REQUESTS_PER_MINUTE = 10;
export const DEDUPLICATION_WINDOW_MS = 5000;

export function getMaxConcurrentRequests(): number {
  return parseInt(process.env.OLLAMA_MAX_CONCURRENT_REQUESTS || String(DEFAULT_MAX_CONCURRENT_REQUESTS), 10);
}

export function getMaxRequestsPerMinute(): number {
  return parseInt(process.env.OLLAMA_MAX_REQUESTS_PER_MINUTE || String(DEFAULT_MAX_REQUESTS_PER_MINUTE), 10);
}

// ============================================================================
// QUEUE STATE VARIABLES
// ============================================================================

let requestQueue: QueuedRequest[] = [];
let activeRequests: Set<string> = new Set();
let deduplicationCache: Map<string, RequestDeduplicationEntry> = new Map();
let rateLimiters: Map<string, ModelRateLimiter> = new Map();
let queueMetrics: QueueMetrics = {
  queueLength: 0,
  activeRequests: 0,
  totalProcessed: 0,
  totalDeduplicationHits: 0,
  averageWaitTimeMs: 0,
  totalRequests: 0,
  modelStats: {},
};
let isProcessingQueue = false;
let cleanupInterval: NodeJS.Timeout | null = null;

// ============================================================================
// EXISTING OLLAMA UTILS
// ============================================================================

interface ModelCache {
  models: string[];
  timestamp: number;
  ttl: number;
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

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const HEALTH_CHECK_TIMEOUT = 5000;
const CACHE_TTL = 300000;
const WARMUP_TIMEOUT = 120000;
const CACHE_HIT_COUNTER = { hits: 0 };

export const OLLAMA_TIMEOUT_CONFIG = {
  SMALL_MODEL_TIMEOUT: 30000,
  MEDIUM_MODEL_TIMEOUT: 45000,
  LARGE_MODEL_TIMEOUT: 60000,
  FIRST_LOAD_MULTIPLIER: 2,
};

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
    let errorMessage = "Unknown error";

    if (axiosError.code === "ECONNREFUSED") {
      errorMessage = `Ollama service not running at ${OLLAMA_BASE_URL}`;
    } else if (axiosError.response?.status === 404) {
      errorMessage = "Ollama API endpoint not found";
    } else if (axiosError.code === "ETIMEDOUT") {
      errorMessage = "Ollama connection timeout";
    } else {
      errorMessage = axiosError.message || "Failed to connect to Ollama";
    }

    return {
      available: false,
      models: [],
      error: errorMessage,
    };
  }
}

export async function getAvailableOllamaModels(): Promise<ModelAvailabilityResponse> {
  if (modelCache && Date.now() - modelCache.timestamp < modelCache.ttl) {
    CACHE_HIT_COUNTER.hits++;
    const age = Date.now() - modelCache.timestamp;
    const ttl = modelCache.ttl;
    console.log(
      `[Ollama Utils] Cache HIT: ${modelCache.models.length} models (age: ${Math.floor(
        age / 1000
      )}s, TTL: ${ttl / 1000}s remaining)`
    );
    return {
      available: true,
      models: modelCache.models,
    };
  }

  console.log(`[Ollama Utils] Cache MISS: fetching fresh models from Ollama`);
  const health = await checkOllamaHealth();
  if (!health.available) {
    return health;
  }

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

export function calculateOllamaTimeout(
  ollamaModelSize?: "small" | "medium" | "large"
): number {
  switch (ollamaModelSize) {
    case "small":
      return OLLAMA_TIMEOUT_CONFIG.SMALL_MODEL_TIMEOUT;
    case "medium":
      return OLLAMA_TIMEOUT_CONFIG.MEDIUM_MODEL_TIMEOUT;
    case "large":
      return OLLAMA_TIMEOUT_CONFIG.LARGE_MODEL_TIMEOUT;
    default:
      return OLLAMA_TIMEOUT_CONFIG.MEDIUM_MODEL_TIMEOUT;
  }
}

export function isFirstLoad(modelName: string): boolean {
  return !loadedModels.has(modelName);
}

export function markModelAsLoaded(modelName: string): void {
  loadedModels.add(modelName);
}

export function getOllamaTimeoutWithFirstLoad(
  modelName: string,
  ollamaModelSize?: "small" | "medium" | "large"
): number {
  const baseTimeout = calculateOllamaTimeout(ollamaModelSize);
  const firstLoad = isFirstLoad(modelName);

  return firstLoad
    ? baseTimeout * OLLAMA_TIMEOUT_CONFIG.FIRST_LOAD_MULTIPLIER
    : baseTimeout;
}

export async function warmupOllamaModels(
  models: string[] = ["mistral:7b", "gemma2:9b", "codellama:7b"]
): Promise<WarmupResult> {
  const startTime = Date.now();
  const warmedModels: string[] = [];
  const failedModels: string[] = [];

  console.log(
    `[Ollama Utils ${new Date().toISOString()}] Starting model warmup for ${models.length} models: ${models.join(
      ", "
    )}`
  );

  for (const modelName of models) {
    const modelStartTime = Date.now();
    try {
      console.log(
        `[Ollama Utils ${new Date().toISOString()}] Warming up model ${modelName}...`
      );

      await axios.post(
        `${OLLAMA_BASE_URL}/api/generate`,
        {
          model: modelName,
          prompt: "test",
          stream: false,
        },
        {
          timeout: WARMUP_TIMEOUT,
        }
      );

      const modelDuration = Date.now() - modelStartTime;
      console.log(
        `[Ollama Utils ${new Date().toISOString()}] Model ${modelName} ready (${modelDuration}ms)`
      );
      warmedModels.push(modelName);
      markModelAsLoaded(modelName);
    } catch (error) {
      const modelDuration = Date.now() - modelStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(
        `[Ollama Utils ${new Date().toISOString()}] Model ${modelName} failed: ${errorMessage} (${modelDuration}ms)`
      );
      failedModels.push(modelName);
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(
    `[Ollama Utils ${new Date().toISOString()}] Model warmup completed: ${warmedModels.length} warmed, ${failedModels.length} failed in ${totalTime}ms`
  );

  return {
    warmedModels,
    failedModels,
    totalTime,
  };
}

export function getCacheStats(): {
  hitRate: number;
  hitCount: number;
  isCached: boolean;
  cacheAge: number | null;
} {
  if (!modelCache) {
    return { hitRate: 0, hitCount: 0, isCached: false, cacheAge: null };
  }

  const age = Date.now() - modelCache.timestamp;
  const isValid = age < modelCache.ttl;

  return {
    hitRate: CACHE_HIT_COUNTER.hits / 100,
    hitCount: CACHE_HIT_COUNTER.hits,
    isCached: isValid,
    cacheAge: isValid ? Math.floor(age / 1000) : null,
  };
}

// ============================================================================
// QUEUE MANAGEMENT FUNCTIONS
// ============================================================================

export function generateRequestHash(modelName: string, payload: any): string {
  const messages = payload.messages || [];
  const messageContent = messages.map((m: any) => `${m.role}:${m.content}`).join("|");
  return `${modelName}:${messageContent}`;
}

export function getPriorityFromAgentCategory(agentId: string): number {
  if (agentId.includes("fast-chat") || agentId.includes("gemini-agent")) {
    return RequestPriority.HIGH;
  }

  if (
    agentId.includes("web-dev") ||
    agentId.includes("content") ||
    agentId.includes("nano-banana")
  ) {
    return RequestPriority.MEDIUM;
  }

  if (
    agentId.includes("analytics") ||
    agentId.includes("marketing") ||
    agentId.includes("social") ||
    agentId.includes("seo")
  ) {
    return RequestPriority.LOW;
  }

  return RequestPriority.MEDIUM;
}

export function checkRateLimit(modelName: string, recordOnly = false): boolean {
  const now = Date.now();
  let limiter = rateLimiters.get(modelName);

  if (!limiter) {
    limiter = {
      modelName,
      requestTimestamps: [],
      maxRequestsPerMinute: getMaxRequestsPerMinute(),
    };
    rateLimiters.set(modelName, limiter);
  }

  const oneMinuteAgo = now - 60000;
  limiter.requestTimestamps = limiter.requestTimestamps.filter(
    (ts) => ts > oneMinuteAgo
  );

  const isUnderLimit =
    limiter.requestTimestamps.length < limiter.maxRequestsPerMinute;

  if (isUnderLimit) {
    limiter.requestTimestamps.push(now);
  }

  return isUnderLimit;
}

export function getRateLimitStatus(modelName: string): {
  current: number;
  limit: number;
  status: string;
} {
  const now = Date.now();
  let limiter = rateLimiters.get(modelName);

  if (!limiter) {
    return {
      current: 0,
      limit: getMaxRequestsPerMinute(),
      status: "ok",
    };
  }

  const oneMinuteAgo = now - 60000;
  limiter.requestTimestamps = limiter.requestTimestamps.filter(
    (ts) => ts > oneMinuteAgo
  );

  const current = limiter.requestTimestamps.length;
  const limit = limiter.maxRequestsPerMinute;

  return {
    current,
    limit,
    status: current >= limit ? "rate_limited" : "ok",
  };
}

export function addToQueue(request: QueuedRequest): void {
  const insertIndex = requestQueue.findIndex(
    (r) => r.priority > request.priority
  );

  if (insertIndex === -1) {
    requestQueue.push(request);
  } else {
    requestQueue.splice(insertIndex, 0, request);
  }

  queueMetrics.queueLength = requestQueue.length;
  queueMetrics.totalRequests++;

  if (!queueMetrics.modelStats[request.modelName]) {
    queueMetrics.modelStats[request.modelName] = {
      queued: 0,
      active: 0,
      rateLimitStatus: "ok",
    };
  }
  queueMetrics.modelStats[request.modelName].queued++;

  console.log(
    `[Queue] Added request ${request.id} to queue: priority=${request.priority}, queueLength=${requestQueue.length}, model=${request.modelName}`
  );
}

export function getQueuePosition(requestId: string): number {
  const index = requestQueue.findIndex((r) => r.id === requestId);
  if (index === -1) {
    return -1;
  }
  return index + 1;
}

// ============================================================================
// REQUEST DEDUPLICATION
// ============================================================================

export function checkDeduplication(hash: string): Promise<any> | null {
  const entry = deduplicationCache.get(hash);

  if (entry && Date.now() - entry.timestamp < DEDUPLICATION_WINDOW_MS) {
    queueMetrics.totalDeduplicationHits++;
    console.log(
      `[Queue] Deduplication hit for hash: ${hash.substring(0, 50)}...`
    );
    return entry.promise;
  }

  return null;
}

export function addToDeduplicationCache(hash: string, promise: Promise<any>): void {
  deduplicationCache.set(hash, {
    hash,
    promise,
    timestamp: Date.now(),
  });

  console.log(`[Queue] Added to deduplication cache: ${hash.substring(0, 50)}...`);
}

export function cleanupDeduplicationCache(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [hash, entry] of deduplicationCache.entries()) {
    if (now - entry.timestamp >= DEDUPLICATION_WINDOW_MS) {
      deduplicationCache.delete(hash);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(
      `[Queue] Cleaned ${cleaned} expired deduplication entries, remaining: ${deduplicationCache.size}`
    );
  }
}

// ============================================================================
// CORE QUEUE REQUEST FUNCTION
// ============================================================================

export function queueOllamaRequest(
  modelName: string,
  payload: any,
  agentId: string,
  ollamaModelSize?: "small" | "medium" | "large"
): Promise<{ result: any; metadata: QueueRequestResult }> {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const priority = getPriorityFromAgentCategory(agentId);
  const enqueueTime = Date.now();

  return new Promise((resolve, reject) => {
    // Check deduplication
    const hash = generateRequestHash(modelName, payload);
    const existingPromise = checkDeduplication(hash);

    if (existingPromise) {
      // Dedup hit - return the existing promise with dedup hit metadata
      resolve({
        result: existingPromise,
        metadata: {
          requestId,
          position: 0,
          enqueueTime,
          isDedupHit: true,
          waitTimeMs: 0,
        },
      });
      return;
    }

    const abortController = new AbortController();

    const request: QueuedRequest = {
      id: requestId,
      modelName,
      payload,
      priority,
      timestamp: Date.now(),
      resolve: () => {},
      reject: () => {},
      abortController,
      agentId,
      enqueueTime,
    };

    // Create promise that tracks the actual request execution
    const requestPromise = new Promise<any>((res, rej) => {
      request.resolve = res;
      request.reject = rej;
    });

    // Add to deduplication cache
    addToDeduplicationCache(hash, requestPromise);

    // Add to queue - rate limit will be checked at dequeue/execute time in processQueue()
    addToQueue(request);

    // Start queue processor if not running
    if (!isProcessingQueue) {
      processQueue();
    }

    // Resolve the outer Promise with the inner requestPromise wrapped with metadata
    // The caller will receive the actual response when requestPromise resolves
    resolve({
      result: requestPromise,
      metadata: {
        requestId,
        position: requestQueue.length,
        enqueueTime,
        isDedupHit: false,
        waitTimeMs: 0,
      },
    });

    console.log(
      `[Queue] Request ${requestId} queued: model=${modelName}, agent=${agentId}, priority=${priority}`
    );
  });
}

async function executeOllamaRequest(request: QueuedRequest): Promise<any> {
  const { modelName, payload, abortController, enqueueTime } = request;
  const timeoutMs = getOllamaTimeoutWithFirstLoad(modelName);

  console.log(
    `[Queue] Executing request ${request.id}: model=${modelName}, timeout=${timeoutMs}ms`
  );

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Ollama model "${modelName}" not found. Please pull it using 'ollama pull ${modelName}'`
        );
      }
      throw new Error(`Ollama API returned ${response.status}`);
    }

    const data = await response.json();

    // Calculate wait time
    const waitTime = Date.now() - enqueueTime;
    queueMetrics.totalProcessed++;

    // Update average wait time
    const totalWaitTime =
      queueMetrics.averageWaitTimeMs * (queueMetrics.totalProcessed - 1) +
      waitTime;
    queueMetrics.averageWaitTimeMs = Math.round(
      totalWaitTime / queueMetrics.totalProcessed
    );

    // Mark model as loaded
    markModelAsLoaded(modelName);

    // Update model stats
    if (queueMetrics.modelStats[modelName]) {
      queueMetrics.modelStats[modelName].active--;
    }

    return data;
  } catch (error) {
    // Update model stats on error
    if (queueMetrics.modelStats[modelName]) {
      queueMetrics.modelStats[modelName].active--;
    }
    throw error;
  }
}

// ============================================================================
// QUEUE PROCESSOR
// ============================================================================

async function processQueue(): Promise<void> {
  if (isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0 && activeRequests.size < getMaxConcurrentRequests()) {
    const request = requestQueue.shift();
    if (!request) {
      continue;
    }

    // Check rate limit again
    if (!checkRateLimit(request.modelName)) {
      // Rate limited, re-queue with delay
      request.reject(
        new Error(
          `Rate limit exceeded for model ${request.modelName}. Try again in 60 seconds.`
        )
      );
      continue;
    }

    // Track active request
    activeRequests.add(request.id);
    queueMetrics.activeRequests++;

    // Update model stats
    if (queueMetrics.modelStats[request.modelName]) {
      queueMetrics.modelStats[request.modelName].queued--;
      queueMetrics.modelStats[request.modelName].active++;
    }

    // Execute request
    const startTime = Date.now();
    executeOllamaRequest(request)
      .then((result) => {
        const duration = Date.now() - startTime;
        console.log(
          `[Queue] Request ${request.id} completed: model=${request.modelName}, duration=${duration}ms`
        );
        request.resolve(result);
      })
      .catch((error) => {
        const duration = Date.now() - startTime;
        console.log(
          `[Queue] Request ${request.id} failed: model=${request.modelName}, error=${error.message}, duration=${duration}ms`
        );
        request.reject(error);
      })
      .finally(() => {
        activeRequests.delete(request.id);
        queueMetrics.activeRequests--;
        queueMetrics.queueLength = requestQueue.length;
      });
  }

  isProcessingQueue = false;

  // Continue processing if more requests
  if (requestQueue.length > 0) {
    setImmediate(processQueue);
  }
}

// ============================================================================
// QUEUE MONITORING FUNCTIONS
// ============================================================================

export function getQueueStatus(): QueueStatus {
  // Update model stats with current rate limit status
  for (const modelName of Object.keys(queueMetrics.modelStats)) {
    const rateStatus = getRateLimitStatus(modelName);
    queueMetrics.modelStats[modelName].rateLimitStatus = rateStatus.status;
  }

  return {
    queueLength: queueMetrics.queueLength,
    activeRequests: queueMetrics.activeRequests,
    maxConcurrency: getMaxConcurrentRequests(),
    totalProcessed: queueMetrics.totalProcessed,
    deduplicationHits: queueMetrics.totalDeduplicationHits,
    averageWaitTimeMs: queueMetrics.averageWaitTimeMs,
    modelStats: { ...queueMetrics.modelStats },
    timestamp: new Date().toISOString(),
  };
}

export function clearQueue(): void {
  // Reject all pending requests
  for (const request of requestQueue) {
    request.reject(new Error("Queue cleared"));
  }

  // Reset queue state
  requestQueue = [];
  queueMetrics.queueLength = 0;
  queueMetrics.totalRequests = 0;
  queueMetrics.modelStats = {};

  console.log("[Queue] Queue cleared");
}

export function startQueueCleanup(): void {
  if (cleanupInterval) {
    return;
  }

  cleanupInterval = setInterval(() => {
    cleanupDeduplicationCache();

    // Log metrics periodically
    if (queueMetrics.totalProcessed % 10 === 0 && queueMetrics.totalProcessed > 0) {
      console.log(
        `[Queue] Metrics: processed=${queueMetrics.totalProcessed}, queueLength=${queueMetrics.queueLength}, active=${queueMetrics.activeRequests}, deduplicationHits=${queueMetrics.totalDeduplicationHits}, avgWaitTime=${queueMetrics.averageWaitTimeMs}ms`
      );
    }

    // Alert if queue is getting long
    if (queueMetrics.queueLength > 10) {
      console.warn(
        `[Queue] WARNING: Queue length (${queueMetrics.queueLength}) exceeds threshold. Consider scaling up.`
      );
    }
  }, 10000);

  console.log("[Queue] Cleanup interval started");
}

export function stopQueueCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log("[Queue] Cleanup interval stopped");
  }
}

export function shutdownQueue(): Promise<void> {
  return new Promise((resolve) => {
    console.log(
      `[Queue] Shutting down: ${requestQueue.length} queued, ${activeRequests.size} active`
    );

    // Stop accepting new requests
    stopQueueCleanup();

    // Wait for active requests to complete (max 30 seconds)
    const shutdownTimeout = setTimeout(() => {
      console.log("[Queue] Shutdown timeout - forcing exit");
      clearQueue();
      resolve();
    }, 30000);

    // Check periodically if we can resolve
    const checkInterval = setInterval(() => {
      if (activeRequests.size === 0) {
        clearInterval(checkInterval);
        clearTimeout(shutdownTimeout);
        console.log(
          `[Queue] Shutdown complete: ${queueMetrics.totalProcessed} total requests processed`
        );
        resolve();
      }
    }, 100);
  });
}

// Start cleanup on module load
startQueueCleanup();

