import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { providerHealthMonitor } from '../provider-health-monitor';
import { AIProvider } from '@/lib/provider-config';

describe('ProviderHealthMonitor', () => {
  // Reset the singleton state before each test if possible, 
  // but since it's a singleton module, we might need to rely on unique providers or just testing logic flow.
  // For this test, we'll assume we can access the private map or just use fresh provider names if types allowed,
  // but AIProvider is a union type. We will simulate sequences.
  
  // Note: In a real app, we might want to export the class to instantiate fresh instances for testing.
  // Here we will just test the logic with a specific provider and reset manually if needed or just follow flow.
  
  const TEST_PROVIDER: AIProvider = 'openai';

  beforeEach(() => {
    // Reset state for TEST_PROVIDER by recording enough successes to clear blocks
    // and waiting if needed (mocking time would be better)
    jest.useFakeTimers();
    
    // Clear any existing block
    providerHealthMonitor.recordSuccess(TEST_PROVIDER);
    // Clear consecutive failures
    providerHealthMonitor.recordSuccess(TEST_PROVIDER);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should track consecutive failures and trigger circuit breaker', () => {
    // Initially available
    expect(providerHealthMonitor.isProviderAvailable(TEST_PROVIDER)).toBe(true);

    // 1st failure
    providerHealthMonitor.recordFailure(TEST_PROVIDER);
    expect(providerHealthMonitor.isProviderAvailable(TEST_PROVIDER)).toBe(true);
    expect(providerHealthMonitor.getProviderStatus(TEST_PROVIDER).consecutiveFailures).toBe(1);

    // 2nd failure
    providerHealthMonitor.recordFailure(TEST_PROVIDER);
    expect(providerHealthMonitor.isProviderAvailable(TEST_PROVIDER)).toBe(true);

    // 3rd failure - Should trigger block
    providerHealthMonitor.recordFailure(TEST_PROVIDER);
    expect(providerHealthMonitor.isProviderAvailable(TEST_PROVIDER)).toBe(false);
    expect(providerHealthMonitor.getProviderStatus(TEST_PROVIDER).isBlocked).toBe(true);
  });

  it('should unblock provider after timeout', () => {
    // Trigger block
    providerHealthMonitor.recordFailure(TEST_PROVIDER);
    providerHealthMonitor.recordFailure(TEST_PROVIDER);
    providerHealthMonitor.recordFailure(TEST_PROVIDER);
    
    expect(providerHealthMonitor.isProviderAvailable(TEST_PROVIDER)).toBe(false);

    // Advance time by 5 minutes + 1 second
    jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

    // Should be available again (half-open)
    expect(providerHealthMonitor.isProviderAvailable(TEST_PROVIDER)).toBe(true);
  });

  it('should reset failure count on success', () => {
    providerHealthMonitor.recordFailure(TEST_PROVIDER);
    providerHealthMonitor.recordFailure(TEST_PROVIDER);
    expect(providerHealthMonitor.getProviderStatus(TEST_PROVIDER).consecutiveFailures).toBe(2);

    providerHealthMonitor.recordSuccess(TEST_PROVIDER);
    expect(providerHealthMonitor.getProviderStatus(TEST_PROVIDER).consecutiveFailures).toBe(0);
  });

  it('should prioritize healthy providers over blocked ones', () => {
    const healthyProvider: AIProvider = 'anthropic';
    const blockedProvider: AIProvider = 'google';

    // Setup healthy
    providerHealthMonitor.recordSuccess(healthyProvider);

    // Setup blocked
    providerHealthMonitor.recordFailure(blockedProvider);
    providerHealthMonitor.recordFailure(blockedProvider);
    providerHealthMonitor.recordFailure(blockedProvider);

    const providers: AIProvider[] = [blockedProvider, healthyProvider];
    const sorted = providerHealthMonitor.getPrioritizedProviders(providers);

    expect(sorted[0]).toBe(healthyProvider);
    expect(sorted[1]).toBe(blockedProvider);
  });

  it('should calculate success rate correctly', () => {
    providerHealthMonitor.recordSuccess(TEST_PROVIDER); // 1/1
    providerHealthMonitor.recordFailure(TEST_PROVIDER); // 1/2 = 50%
    
    expect(providerHealthMonitor.getProviderStatus(TEST_PROVIDER).successRate).toBe(0.5);
  });
});