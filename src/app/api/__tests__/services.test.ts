/**
 * Unit tests for Services API
 * 
 * Tests the /api/services endpoint for:
 * - GET: Fetching active services
 * - POST: Creating new services with validation
 */

import { NextRequest } from 'next/server';

// Mock the database module
jest.mock('@/server-lib/internal-db-query', () => ({
  queryInternalDatabase: jest.fn(),
}));

import { GET, POST } from '../services/route';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';

const mockQuery = queryInternalDatabase as jest.MockedFunction<typeof queryInternalDatabase>;

describe('GET /api/services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches all active services', async () => {
    const mockServices = [
      { id: '1', name: 'Basic', tier: 'basic', price: 999, features: '["Feature 1"]', is_active: true },
      { id: '2', name: 'Growth', tier: 'growth', price: 2499, features: '["Feature 1", "Feature 2"]', is_active: true },
    ];
    mockQuery.mockResolvedValue(mockServices);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM services WHERE is_active = true ORDER BY price ASC'
    );
  });

  test('parses JSON features string correctly', async () => {
    const mockServices = [
      { id: '1', name: 'Basic', tier: 'basic', price: 999, features: '["Feature A", "Feature B"]', is_active: true },
    ];
    mockQuery.mockResolvedValue(mockServices);

    const response = await GET();
    const data = await response.json();

    expect(data[0].features).toEqual(['Feature A', 'Feature B']);
  });

  test('handles already-parsed features array', async () => {
    const mockServices = [
      { id: '1', name: 'Basic', tier: 'basic', price: 999, features: ['Feature A', 'Feature B'], is_active: true },
    ];
    mockQuery.mockResolvedValue(mockServices);

    const response = await GET();
    const data = await response.json();

    expect(data[0].features).toEqual(['Feature A', 'Feature B']);
  });

  test('returns empty array when no services exist', async () => {
    mockQuery.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database connection failed'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch services' });
  });
});

describe('POST /api/services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a service with required fields', async () => {
    const newService = {
      id: '1',
      name: 'Basic Plan',
      tier: 'basic',
      price: 999,
      features: [],
    };
    mockQuery.mockResolvedValue([newService]);

    const request = new NextRequest('http://localhost:3000/api/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'Basic Plan', tier: 'basic', price: 999 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(newService);
  });

  test('creates a service with all fields including features', async () => {
    const newService = {
      id: '1',
      name: 'Enterprise Plan',
      description: 'Full enterprise solution',
      tier: 'enterprise',
      price: 4999,
      features: ['24/7 Support', 'Custom Integrations', 'Dedicated Manager'],
    };
    mockQuery.mockResolvedValue([newService]);

    const request = new NextRequest('http://localhost:3000/api/services', {
      method: 'POST',
      body: JSON.stringify(newService),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO services'),
      expect.arrayContaining([
        'Enterprise Plan',
        'Full enterprise solution',
        'enterprise',
        4999,
      ])
    );
  });

  test('returns 400 when name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/services', {
      method: 'POST',
      body: JSON.stringify({ tier: 'basic', price: 999 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Name, tier, and price are required' });
  });

  test('returns 400 when tier is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'Basic', price: 999 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Name, tier, and price are required' });
  });

  test('returns 400 when price is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'Basic', tier: 'basic' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Name, tier, and price are required' });
  });

  test('accepts price of 0', async () => {
    const newService = {
      id: '1',
      name: 'Free Plan',
      tier: 'basic',
      price: 0,
    };
    mockQuery.mockResolvedValue([newService]);

    const request = new NextRequest('http://localhost:3000/api/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'Free Plan', tier: 'basic', price: 0 }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  test('uses empty array for features when not provided', async () => {
    mockQuery.mockResolvedValue([{ id: '1', name: 'Basic', tier: 'basic', price: 999, features: [] }]);

    const request = new NextRequest('http://localhost:3000/api/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'Basic', tier: 'basic', price: 999 }),
    });
    await POST(request);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['[]'])
    );
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'Basic', tier: 'basic', price: 999 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to create service' });
  });
});
