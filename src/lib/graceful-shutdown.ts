import { shutdownQueue } from '@/server-lib/ollama-utils';
import { closeRedisConnection } from '@/server-lib/redis-cache';

let isShuttingDown = false;

export async function handleGracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log('[Shutdown] Already shutting down, ignoring signal');
    return;
  }

  isShuttingDown = true;
  console.log(`[Shutdown] Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop accepting new requests
    console.log('[Shutdown] Stopping new request acceptance...');

    // Shutdown Ollama queue (waits for active requests, max 30s)
    console.log('[Shutdown] Waiting for Ollama queue to drain...');
    await shutdownQueue();

    // Close Redis connection
    console.log('[Shutdown] Closing Redis connection...');
    await closeRedisConnection();

    console.log('[Shutdown] Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Shutdown] Error during graceful shutdown:', error);
    process.exit(1);
  }
}

export function registerShutdownHandlers(): void {
  // Only register in production
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

  console.log('[Shutdown] Graceful shutdown handlers registered');
}
