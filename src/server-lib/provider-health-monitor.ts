import { AIProvider } from "@/lib/provider-config";

interface RequestRecord {
  timestamp: number;
  success: boolean;
}

interface ProviderState {
  consecutiveFailures: number;
  blockedUntil: number | null;
  requests: RequestRecord[];
}

export interface ProviderHealthStatus {
  provider: AIProvider;
  isHealthy: boolean;
  isBlocked: boolean;
  successRate: number;
  consecutiveFailures: number;
  blockedUntil: number | null;
  totalRequestsInWindow: number;
}

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CONSECUTIVE_FAILURES = 3;

class ProviderHealthMonitor {
  private states: Map<AIProvider, ProviderState> = new Map();

  constructor() {
    // Initialize states for known providers if needed, or lazy load
  }

  private getState(provider: AIProvider): ProviderState {
    if (!this.states.has(provider)) {
      this.states.set(provider, {
        consecutiveFailures: 0,
        blockedUntil: null,
        requests: [],
      });
    }
    return this.states.get(provider)!;
  }

  /**
   * Records a successful API call to a provider.
   * Resets consecutive failures and updates rolling window stats.
   */
  public recordSuccess(provider: AIProvider): void {
    const state = this.getState(provider);
    state.consecutiveFailures = 0;
    
    // If it was blocked (half-open or expired block), clear the block
    if (state.blockedUntil && Date.now() > state.blockedUntil) {
      state.blockedUntil = null;
    }

    this.addRequest(state, true);
  }

  /**
   * Records a failed API call to a provider.
   * Increments consecutive failures and triggers circuit breaker if threshold reached.
   */
  public recordFailure(provider: AIProvider): void {
    const state = this.getState(provider);
    state.consecutiveFailures++;

    // Trigger circuit breaker if threshold reached
    if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      state.blockedUntil = Date.now() + BLOCK_DURATION_MS;
    }

    this.addRequest(state, false);
  }

  private addRequest(state: ProviderState, success: boolean): void {
    const now = Date.now();
    state.requests.push({ timestamp: now, success });
    this.pruneOldRequests(state, now);
  }

  private pruneOldRequests(state: ProviderState, now: number): void {
    const windowStart = now - WINDOW_MS;
    // Remove requests older than the window
    // Since we push in order, we can just shift from the front
    while (state.requests.length > 0 && state.requests[0].timestamp < windowStart) {
      state.requests.shift();
    }
  }

  /**
   * Checks if a provider is currently available for use.
   * Returns false if the provider is blocked by the circuit breaker.
   */
  public isProviderAvailable(provider: AIProvider): boolean {
    const state = this.getState(provider);
    
    if (state.blockedUntil) {
      if (Date.now() < state.blockedUntil) {
        return false; // Still blocked
      } else {
        // Block expired, allow trial (half-open state implicitly handled by next success/fail)
        return true;
      }
    }
    
    return true;
  }

  /**
   * Gets detailed health status for a provider.
   */
  public getProviderStatus(provider: AIProvider): ProviderHealthStatus {
    const state = this.getState(provider);
    const now = Date.now();
    this.pruneOldRequests(state, now);

    const total = state.requests.length;
    const successes = state.requests.filter(r => r.success).length;
    const successRate = total > 0 ? successes / total : 1.0;
    
    const isBlocked = !!(state.blockedUntil && now < state.blockedUntil);

    return {
      provider,
      isHealthy: !isBlocked && state.consecutiveFailures < 2,
      isBlocked,
      successRate,
      consecutiveFailures: state.consecutiveFailures,
      blockedUntil: state.blockedUntil,
      totalRequestsInWindow: total,
    };
  }

  /**
   * Returns a list of providers sorted by health priority.
   * 1. Available providers first
   * 2. Then by success rate (descending)
   * 3. Then by original order
   * 
   * Use this in executeWithFallback() to dynamically reorder providers.
   */
  public getPrioritizedProviders(providers: AIProvider[]): AIProvider[] {
    return [...providers].sort((a, b) => {
      const statusA = this.getProviderStatus(a);
      const statusB = this.getProviderStatus(b);

      // 1. Blocked providers go last
      if (statusA.isBlocked && !statusB.isBlocked) return 1;
      if (!statusA.isBlocked && statusB.isBlocked) return -1;

      // 2. Sort by success rate (higher is better)
      // Only consider if we have data
      if (statusA.totalRequestsInWindow > 0 && statusB.totalRequestsInWindow > 0) {
        return statusB.successRate - statusA.successRate;
      }

      return 0; // Keep original order
    });
  }
}

export const providerHealthMonitor = new ProviderHealthMonitor();