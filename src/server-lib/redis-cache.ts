import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL = 300; // 5 minutes
const CACHE_ENABLED = process.env.REDIS_CACHE_ENABLED !== 'false';

export async function getRedisClient() {
  if (!CACHE_ENABLED) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({ url: REDIS_URL });
    
    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    await redisClient.connect();
  }

  return redisClient;
}

export async function getCachedAIResponse(key: string): Promise<any | null> {
  if (!CACHE_ENABLED) {
    return null;
  }

  try {
    const client = await getRedisClient();
    if (!client) return null;

    const cached = await client.get(key);
    if (cached) {
      console.log(`[Redis] Cache HIT: ${key.substring(0, 50)}...`);
      return JSON.parse(cached);
    }

    console.log(`[Redis] Cache MISS: ${key.substring(0, 50)}...`);
    return null;
  } catch (error) {
    console.error('[Redis] Get error:', error);
    return null;
  }
}

export async function setCachedAIResponse(key: string, value: any, ttl: number = CACHE_TTL): Promise<void> {
  if (!CACHE_ENABLED) {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.setEx(key, ttl, JSON.stringify(value));
    console.log(`[Redis] Cached response: ${key.substring(0, 50)}... (TTL: ${ttl}s)`);
  } catch (error) {
    console.error('[Redis] Set error:', error);
  }
}

export function generateCacheKey(provider: string, model: string, messages: any[]): string {
  const messageContent = messages.map(m => `${m.role}:${m.content}`).join('|');
  return `ai:${provider}:${model}:${messageContent}`;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Connection closed');
  }
}
