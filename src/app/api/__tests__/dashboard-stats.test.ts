/**
 * Unit tests for Dashboard Stats API
 * 
 * Tests the /api/dashboard/stats endpoint for:
 * - Aggregated statistics
 * - Lead metrics
 * - Conversation and appointment counts
 */

// Mock the database module
jest.mock('@/server-lib/internal-db-query', () => ({
  queryInternalDatabase: jest.fn(),
}));

import { GET } from '../dashboard/stats/route';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';
import { NextRequest } from 'next/server';

const mockQuery = queryInternalDatabase as jest.MockedFunction<typeof queryInternalDatabase>;

// Helper to create mock NextRequest
const createMockRequest = () => {
  return new NextRequest('http://localhost:3000/api/dashboard/stats');
};

describe('GET /api/dashboard/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns complete dashboard stats', async () => {
    // Mock all database calls in sequence
    mockQuery
      // Total leads
      .mockResolvedValueOnce([{ count: '100' }])
      // Qualified leads
      .mockResolvedValueOnce([{ count: '25' }])
      // Active conversations
      .mockResolvedValueOnce([{ count: '10' }])
      // Upcoming appointments
      .mockResolvedValueOnce([{ count: '5' }])
      // Won leads (for revenue)
      .mockResolvedValueOnce([{ count: '3' }])
      // Leads by status
      .mockResolvedValueOnce([
        { status: 'new', count: '50' },
        { status: 'qualified', count: '25' },
        { status: 'won', count: '3' },
      ])
      // Leads by source
      .mockResolvedValueOnce([
        { source: 'website', count: '60' },
        { source: 'chat', count: '30' },
        { source: 'referral', count: '10' },
      ])
      // Recent leads
      .mockResolvedValueOnce([
        { id: '1', name: 'Lead 1', email: 'lead1@example.com' },
        { id: '2', name: 'Lead 2', email: 'lead2@example.com' },
      ]);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalLeads).toBe(100);
    expect(data.qualifiedLeads).toBe(25);
    expect(data.conversionRate).toBe(25);
    expect(data.activeConversations).toBe(10);
    expect(data.upcomingAppointments).toBe(5);
    expect(data.revenue).toBe(3 * 4999);
  });

  test('calculates conversion rate correctly', async () => {
    mockQuery
      .mockResolvedValueOnce([{ count: '200' }])  // Total
      .mockResolvedValueOnce([{ count: '50' }])   // Qualified
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data.conversionRate).toBe(25);  // 50/200 = 25%
  });

  test('handles zero total leads', async () => {
    mockQuery
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data.totalLeads).toBe(0);
    expect(data.conversionRate).toBe(0);  // Should not divide by zero
    expect(data.revenue).toBe(0);
  });

  test('parses leads by status correctly', async () => {
    mockQuery
      .mockResolvedValueOnce([{ count: '10' }])
      .mockResolvedValueOnce([{ count: '5' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([
        { status: 'new', count: '5' },
        { status: 'qualified', count: '3' },
        { status: 'proposal', count: '2' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data.leadsByStatus).toHaveLength(3);
    expect(data.leadsByStatus[0]).toEqual({ status: 'new', count: 5 });
    expect(data.leadsByStatus[1]).toEqual({ status: 'qualified', count: 3 });
    expect(data.leadsByStatus[2]).toEqual({ status: 'proposal', count: 2 });
  });

  test('parses leads by source correctly', async () => {
    mockQuery
      .mockResolvedValueOnce([{ count: '10' }])
      .mockResolvedValueOnce([{ count: '5' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { source: 'website', count: '7' },
        { source: 'chat', count: '3' },
      ])
      .mockResolvedValueOnce([]);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data.leadsBySource).toHaveLength(2);
    expect(data.leadsBySource[0]).toEqual({ source: 'website', count: 7 });
    expect(data.leadsBySource[1]).toEqual({ source: 'chat', count: 3 });
  });

  test('includes recent leads', async () => {
    const recentLeads = [
      { id: '1', name: 'John', email: 'john@example.com', status: 'new' },
      { id: '2', name: 'Jane', email: 'jane@example.com', status: 'qualified' },
    ];

    mockQuery
      .mockResolvedValueOnce([{ count: '10' }])
      .mockResolvedValueOnce([{ count: '5' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(recentLeads);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data.recentLeads).toEqual(recentLeads);
  });

  test('handles missing count property gracefully', async () => {
    mockQuery
      .mockResolvedValueOnce([{}])  // Empty object
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data.totalLeads).toBe(0);
    expect(data.qualifiedLeads).toBe(0);
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database connection failed'));

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch dashboard stats' });
  });

  test('response includes all required fields', async () => {
    mockQuery
      .mockResolvedValueOnce([{ count: '10' }])
      .mockResolvedValueOnce([{ count: '5' }])
      .mockResolvedValueOnce([{ count: '3' }])
      .mockResolvedValueOnce([{ count: '2' }])
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([{ status: 'new', count: '5' }])
      .mockResolvedValueOnce([{ source: 'website', count: '5' }])
      .mockResolvedValueOnce([{ id: '1', name: 'Test', email: 'test@test.com' }]);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(data).toHaveProperty('totalLeads');
    expect(data).toHaveProperty('qualifiedLeads');
    expect(data).toHaveProperty('conversionRate');
    expect(data).toHaveProperty('activeConversations');
    expect(data).toHaveProperty('upcomingAppointments');
    expect(data).toHaveProperty('revenue');
    expect(data).toHaveProperty('leadsByStatus');
    expect(data).toHaveProperty('leadsBySource');
    expect(data).toHaveProperty('recentLeads');
  });
});
