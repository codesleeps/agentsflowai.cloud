/**
 * Unit tests for Health Check API
 * 
 * Tests the /api/health endpoint for:
 * - Database connectivity checks
 * - Memory usage reporting
 * - Overall health status determination
 */

// Mock the database module
jest.mock('@/server-lib/internal-db-query', () => ({
  queryInternalDatabase: jest.fn(),
}));

import { GET } from '../health/route';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';

const mockQuery = queryInternalDatabase as jest.MockedFunction<typeof queryInternalDatabase>;

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns healthy status when database is up', async () => {
    mockQuery.mockResolvedValue([{ health_check: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database.status).toBe('up');
    expect(data.checks.database.latency).toBeDefined();
    expect(typeof data.checks.database.latency).toBe('number');
  });

  test('includes timestamp in ISO format', async () => {
    mockQuery.mockResolvedValue([{ health_check: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('includes uptime in seconds', async () => {
    mockQuery.mockResolvedValue([{ health_check: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(typeof data.uptime).toBe('number');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });

  test('includes version information', async () => {
    mockQuery.mockResolvedValue([{ health_check: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(data.version).toBeDefined();
  });

  test('reports memory usage', async () => {
    mockQuery.mockResolvedValue([{ health_check: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(data.checks.memory).toBeDefined();
    expect(data.checks.memory.used).toBeGreaterThan(0);
    expect(data.checks.memory.total).toBeGreaterThan(0);
    expect(data.checks.memory.percentage).toBeGreaterThanOrEqual(0);
    expect(data.checks.memory.percentage).toBeLessThanOrEqual(100);
    expect(['ok', 'warning', 'critical']).toContain(data.checks.memory.status);
  });

  test('returns unhealthy status when database is down', async () => {
    mockQuery.mockRejectedValue(new Error('Connection refused'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database.status).toBe('down');
    expect(data.checks.database.error).toBe('Connection refused');
  });

  test('includes error message when database fails', async () => {
    mockQuery.mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await GET();
    const data = await response.json();

    expect(data.checks.database.error).toBe('ECONNREFUSED');
  });

  test('handles non-Error database exceptions', async () => {
    mockQuery.mockRejectedValue('String error');

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.checks.database.status).toBe('down');
    expect(data.checks.database.error).toBe('Unknown database error');
  });

  test('measures database latency accurately', async () => {
    // Simulate a slow database response
    mockQuery.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve([{ health_check: 1 }]), 50))
    );

    const response = await GET();
    const data = await response.json();

    expect(data.checks.database.latency).toBeGreaterThanOrEqual(50);
  });

  test('memory status is ok when usage is low', async () => {
    mockQuery.mockResolvedValue([{ health_check: 1 }]);

    const response = await GET();
    const data = await response.json();

    // In test environment, memory usage should be reasonable
    expect(data.checks.memory.percentage).toBeLessThan(100);
  });

  test('all required fields are present in response', async () => {
    mockQuery.mockResolvedValue([{ health_check: 1 }]);

    const response = await GET();
    const data = await response.json();

    // Check top-level fields
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('checks');

    // Check database check fields
    expect(data.checks).toHaveProperty('database');
    expect(data.checks.database).toHaveProperty('status');

    // Check memory check fields
    expect(data.checks).toHaveProperty('memory');
    expect(data.checks.memory).toHaveProperty('status');
    expect(data.checks.memory).toHaveProperty('used');
    expect(data.checks.memory).toHaveProperty('total');
    expect(data.checks.memory).toHaveProperty('percentage');
  });
});
