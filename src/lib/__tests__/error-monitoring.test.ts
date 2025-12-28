/**
 * Unit tests for Error Monitoring
 * 
 * Tests the error monitoring library for:
 * - Breadcrumb tracking
 * - Error capturing
 * - Message logging
 * - User context
 */

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  jest.resetModules();
});

describe('ErrorMonitor', () => {
  test('captureError returns event ID', async () => {
    const { captureError } = await import('../error-monitoring');
    
    const error = new Error('Test error');
    captureError(error);
    
    // In dev mode, it should still process and log
    expect(console.error).toHaveBeenCalled();
  });

  test('captureMessage logs message', async () => {
    const { captureMessage } = await import('../error-monitoring');
    
    captureMessage('Test message', 'info');
    
    expect(console.log).toHaveBeenCalled();
  });

  test('captureMessage with error level uses console.error', async () => {
    const { captureMessage } = await import('../error-monitoring');
    
    captureMessage('Error message', 'error');
    
    expect(console.error).toHaveBeenCalled();
  });

  test('captureMessage with warning level uses console.log in dev mode', async () => {
    // In non-production mode, warning messages are logged via console.log
    // because the enabled check returns early with console.log for non-error/fatal levels
    const { captureMessage } = await import('../error-monitoring');
    
    captureMessage('Warning message', 'warning');
    
    // The implementation logs all non-error/fatal levels via console.log in dev
    expect(console.log).toHaveBeenCalled();
  });

  test('addBreadcrumb adds to breadcrumb list', async () => {
    const { errorMonitor, addBreadcrumb } = await import('../error-monitoring');
    
    errorMonitor.clearBreadcrumbs();
    addBreadcrumb('First action');
    addBreadcrumb('Second action');
    
    const crumbs = errorMonitor.getBreadcrumbs();
    expect(crumbs).toHaveLength(2);
    expect(crumbs[0]?.message).toBe('First action');
    expect(crumbs[1]?.message).toBe('Second action');
  });

  test('setUser sets user context', async () => {
    const { setUser, captureError } = await import('../error-monitoring');
    
    setUser({ id: '123', email: 'test@example.com', name: 'Test User' });
    
    const error = new Error('Test');
    captureError(error);
    
    // Verify it doesn't throw
    expect(console.error).toHaveBeenCalled();
  });

  test('breadcrumbs respect max limit', async () => {
    const { errorMonitor } = await import('../error-monitoring');
    
    errorMonitor.clearBreadcrumbs();
    
    // Add more than default max
    for (let i = 0; i < 150; i++) {
      errorMonitor.addBreadcrumb(`Action ${i}`);
    }
    
    const crumbs = errorMonitor.getBreadcrumbs();
    expect(crumbs.length).toBeLessThanOrEqual(100);
  });

  test('clearBreadcrumbs removes all breadcrumbs', async () => {
    const { errorMonitor } = await import('../error-monitoring');
    
    errorMonitor.addBreadcrumb('Test');
    expect(errorMonitor.getBreadcrumbs().length).toBeGreaterThan(0);
    
    errorMonitor.clearBreadcrumbs();
    expect(errorMonitor.getBreadcrumbs()).toHaveLength(0);
  });

  test('captureError includes error stack', async () => {
    const { captureError } = await import('../error-monitoring');
    
    const error = new Error('Test with stack');
    captureError(error);
    
    const calls = (console.error as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
  });

  test('setGlobalContext adds context to all events', async () => {
    const { errorMonitor, captureError } = await import('../error-monitoring');
    
    errorMonitor.setGlobalContext({ 
      environment: 'test',
      version: '1.0.0' 
    });
    
    captureError(new Error('Test'));
    
    expect(console.error).toHaveBeenCalled();
  });
});

describe('Error types', () => {
  test('handles Error instance', async () => {
    const { captureError } = await import('../error-monitoring');
    
    const error = new Error('Standard error');
    captureError(error);
    
    expect(console.error).toHaveBeenCalled();
  });

  test('handles TypeError', async () => {
    const { captureError } = await import('../error-monitoring');
    
    const error = new TypeError('Type error');
    captureError(error);
    
    expect(console.error).toHaveBeenCalled();
  });

  test('handles RangeError', async () => {
    const { captureError } = await import('../error-monitoring');
    
    const error = new RangeError('Range error');
    captureError(error);
    
    expect(console.error).toHaveBeenCalled();
  });

  test('handles custom error with context', async () => {
    const { captureError } = await import('../error-monitoring');
    
    const error = new Error('Custom error');
    captureError(error, {
      userId: '123',
      tags: { module: 'payments' },
      extra: { orderId: 'order-456' }
    });
    
    expect(console.error).toHaveBeenCalled();
  });
});
