/**
 * Error Monitoring & Reporting
 * 
 * A lightweight error monitoring solution that can be used standalone
 * or integrated with external services like Sentry.
 * 
 * Usage:
 *   import { errorMonitor, captureError, captureMessage } from '@/lib/error-monitoring';
 *   
 *   // Capture an error
 *   captureError(new Error('Something went wrong'), { userId: '123' });
 *   
 *   // Capture a message
 *   captureMessage('User completed checkout', 'info', { orderId: '456' });
 */

type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ErrorEvent {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  stack?: string;
  context: ErrorContext;
  fingerprint?: string;
}

interface ErrorMonitorConfig {
  enabled: boolean;
  dsn?: string; // For Sentry or similar services
  environment: string;
  release?: string;
  sampleRate: number;
  maxBreadcrumbs: number;
  beforeSend?: (event: ErrorEvent) => ErrorEvent | null;
  onError?: (event: ErrorEvent) => void;
}

export class ErrorMonitor {
  private config: ErrorMonitorConfig;
  private breadcrumbs: Array<{ timestamp: string; message: string; level: LogLevel }> = [];
  private globalContext: ErrorContext = {};

  constructor(config?: Partial<ErrorMonitorConfig>) {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.npm_package_version,
      sampleRate: 1.0,
      maxBreadcrumbs: 100,
      ...config,
    };
  }

  /**
   * Initialize the error monitor with configuration
   */
  init(config: Partial<ErrorMonitorConfig>): void {
    this.config = { ...this.config, ...config };

    if (typeof window !== 'undefined') {
      // Browser error handling
      window.addEventListener('error', (event) => {
        this.captureError(event.error ?? new Error(event.message), {
          url: event.filename,
          extra: { lineno: event.lineno, colno: event.colno },
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(
          event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
          { tags: { type: 'unhandledrejection' } }
        );
      });
    }

    // Node.js error handling
    if (typeof process !== 'undefined' && process.on) {
      process.on('uncaughtException', (error) => {
        this.captureError(error, { tags: { type: 'uncaughtException' } });
      });

      process.on('unhandledRejection', (reason) => {
        this.captureError(
          reason instanceof Error ? reason : new Error(String(reason)),
          { tags: { type: 'unhandledRejection' } }
        );
      });
    }
  }

  /**
   * Set global context that will be included with all events
   */
  setGlobalContext(context: ErrorContext): void {
    this.globalContext = { ...this.globalContext, ...context };
  }

  /**
   * Set user information for context
   */
  setUser(user: { id?: string; email?: string; name?: string }): void {
    this.globalContext.userId = user.id;
    this.globalContext.extra = {
      ...this.globalContext.extra,
      userEmail: user.email,
      userName: user.name,
    };
  }

  /**
   * Add a breadcrumb for debugging
   */
  addBreadcrumb(message: string, level: LogLevel = 'info'): void {
    this.breadcrumbs.push({
      timestamp: new Date().toISOString(),
      message,
      level,
    });

    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Capture an error with optional context
   */
  captureError(error: Error, context?: ErrorContext): string {
    if (!this.config.enabled) {
      console.error('[ErrorMonitor]', error);
      return '';
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return '';
    }

    const event: ErrorEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      context: {
        ...this.globalContext,
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
      fingerprint: this.generateFingerprint(error),
    };

    // Allow modification or filtering of events
    const processedEvent = this.config.beforeSend ? this.config.beforeSend(event) : event;
    if (!processedEvent) {
      return '';
    }

    // Send to external service or log
    this.sendEvent(processedEvent);

    return event.id;
  }

  /**
   * Capture a message with optional level and context
   */
  captureMessage(message: string, level: LogLevel = 'info', context?: ErrorContext): string {
    if (!this.config.enabled && level !== 'error' && level !== 'fatal') {
      console.log(`[ErrorMonitor:${level}]`, message);
      return '';
    }

    const event: ErrorEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...this.globalContext,
        ...context,
      },
    };

    const processedEvent = this.config.beforeSend ? this.config.beforeSend(event) : event;
    if (!processedEvent) {
      return '';
    }

    this.sendEvent(processedEvent);

    return event.id;
  }

  /**
   * Create an error boundary wrapper for async functions
   */
  wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    context?: ErrorContext
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.captureError(error instanceof Error ? error : new Error(String(error)), context);
        throw error;
      }
    }) as T;
  }

  /**
   * Create a wrapper for API route handlers
   */
  wrapApiHandler<T>(
    handler: (req: Request) => Promise<T>,
    context?: ErrorContext
  ): (req: Request) => Promise<T> {
    return async (req: Request) => {
      try {
        return await handler(req);
      } catch (error) {
        this.captureError(error instanceof Error ? error : new Error(String(error)), {
          ...context,
          url: req.url,
          extra: { method: req.method },
        });
        throw error;
      }
    };
  }

  /**
   * Get recent breadcrumbs for debugging
   */
  getBreadcrumbs(): Array<{ timestamp: string; message: string; level: LogLevel }> {
    return [...this.breadcrumbs];
  }

  /**
   * Clear all breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private generateFingerprint(error: Error): string {
    // Create a fingerprint based on error message and first stack frame
    const stackLine = error.stack?.split('\n')[1] ?? '';
    const fingerprint = `${error.name}:${error.message}:${stackLine}`;
    return Buffer.from(fingerprint).toString('base64').slice(0, 32);
  }

  private sendEvent(event: ErrorEvent): void {
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const logMethod = event.level === 'error' || event.level === 'fatal' 
        ? console.error 
        : event.level === 'warning' 
          ? console.warn 
          : console.log;
      logMethod(`[ErrorMonitor:${event.level}]`, event.message, event);
      return;
    }

    // Custom error handler
    if (this.config.onError) {
      this.config.onError(event);
    }

    // Send to external service (e.g., custom endpoint)
    if (this.config.dsn) {
      this.sendToEndpoint(event).catch((err) => {
        console.error('[ErrorMonitor] Failed to send event:', err);
      });
    } else {
      // Fallback: log to server console
      console.error(JSON.stringify({
        type: 'error_event',
        ...event,
        breadcrumbs: this.breadcrumbs.slice(-10),
      }));
    }
  }

  private async sendToEndpoint(event: ErrorEvent): Promise<void> {
    if (!this.config.dsn) return;

    try {
      await fetch(this.config.dsn, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...event,
          environment: this.config.environment,
          release: this.config.release,
          breadcrumbs: this.breadcrumbs.slice(-10),
        }),
      });
    } catch (error) {
      // Silently fail to avoid infinite loops
      console.error('[ErrorMonitor] Failed to send to endpoint');
    }
  }
}

// Create a singleton instance
export const errorMonitor = new ErrorMonitor();

// Convenience exports
export const captureError = (error: Error, context?: ErrorContext) => 
  errorMonitor.captureError(error, context);

export const captureMessage = (message: string, level?: LogLevel, context?: ErrorContext) => 
  errorMonitor.captureMessage(message, level, context);

export const setUser = (user: { id?: string; email?: string; name?: string }) => 
  errorMonitor.setUser(user);

export const addBreadcrumb = (message: string, level?: LogLevel) => 
  errorMonitor.addBreadcrumb(message, level);

export type { ErrorContext, ErrorEvent, ErrorMonitorConfig, LogLevel };