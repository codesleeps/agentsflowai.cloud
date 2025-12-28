/**
 * Unit tests for Appointments API
 * 
 * Tests the /api/appointments endpoint for:
 * - GET: Fetching appointments with filters
 * - POST: Creating new appointments with validation
 */

import { NextRequest } from 'next/server';

// Mock the database module
jest.mock('@/server-lib/internal-db-query', () => ({
  queryInternalDatabase: jest.fn(),
}));

import { GET, POST } from '../appointments/route';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';

const mockQuery = queryInternalDatabase as jest.MockedFunction<typeof queryInternalDatabase>;

describe('GET /api/appointments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches all appointments without filters', async () => {
    const mockAppointments = [
      { id: '1', lead_id: 'lead1', title: 'Demo Call', scheduled_at: '2025-01-15T10:00:00Z' },
      { id: '2', lead_id: 'lead2', title: 'Follow-up', scheduled_at: '2025-01-16T14:00:00Z' },
    ];
    mockQuery.mockResolvedValue(mockAppointments);

    const request = new NextRequest('http://localhost:3000/api/appointments');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockAppointments);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM appointments'),
      []
    );
  });

  test('filters appointments by leadId', async () => {
    const mockAppointments = [
      { id: '1', lead_id: 'lead1', title: 'Demo Call', scheduled_at: '2025-01-15T10:00:00Z' },
    ];
    mockQuery.mockResolvedValue(mockAppointments);

    const request = new NextRequest('http://localhost:3000/api/appointments?leadId=lead1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockAppointments);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('lead_id = $1'),
      ['lead1']
    );
  });

  test('filters appointments by status', async () => {
    const mockAppointments = [
      { id: '1', lead_id: 'lead1', title: 'Demo Call', status: 'scheduled' },
    ];
    mockQuery.mockResolvedValue(mockAppointments);

    const request = new NextRequest('http://localhost:3000/api/appointments?status=scheduled');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('status = $1'),
      ['scheduled']
    );
  });

  test('filters upcoming appointments only', async () => {
    const mockAppointments = [
      { id: '1', lead_id: 'lead1', title: 'Future Call', scheduled_at: '2025-12-31T10:00:00Z' },
    ];
    mockQuery.mockResolvedValue(mockAppointments);

    const request = new NextRequest('http://localhost:3000/api/appointments?upcoming=true');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('scheduled_at > NOW()'),
      []
    );
  });

  test('combines multiple filters', async () => {
    mockQuery.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/appointments?leadId=lead1&status=scheduled&upcoming=true');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringMatching(/lead_id = \$1.*AND.*status = \$2.*AND.*scheduled_at > NOW\(\)/s),
      ['lead1', 'scheduled']
    );
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/appointments');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch appointments' });
  });
});

describe('POST /api/appointments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates an appointment with required fields', async () => {
    const newAppointment = {
      id: '1',
      lead_id: 'lead1',
      title: 'Demo Call',
      scheduled_at: '2025-01-15T10:00:00Z',
      duration_minutes: 30,
    };
    mockQuery.mockResolvedValue([newAppointment]);

    const request = new NextRequest('http://localhost:3000/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead1',
        title: 'Demo Call',
        scheduled_at: '2025-01-15T10:00:00Z',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(newAppointment);
  });

  test('creates an appointment with all fields', async () => {
    const newAppointment = {
      id: '1',
      lead_id: 'lead1',
      title: 'Discovery Call',
      description: 'Initial discovery session',
      scheduled_at: '2025-01-15T10:00:00Z',
      duration_minutes: 60,
      meeting_link: 'https://meet.google.com/abc-123',
      notes: 'Prepare demo slides',
    };
    mockQuery.mockResolvedValue([newAppointment]);

    const request = new NextRequest('http://localhost:3000/api/appointments', {
      method: 'POST',
      body: JSON.stringify(newAppointment),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO appointments'),
      expect.arrayContaining([
        'lead1',
        'Discovery Call',
        'Initial discovery session',
        '2025-01-15T10:00:00Z',
        60,
        'https://meet.google.com/abc-123',
        'Prepare demo slides',
      ])
    );
  });

  test('returns 400 when lead_id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Demo Call',
        scheduled_at: '2025-01-15T10:00:00Z',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Lead ID, title, and scheduled time are required' });
  });

  test('returns 400 when title is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead1',
        scheduled_at: '2025-01-15T10:00:00Z',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Lead ID, title, and scheduled time are required' });
  });

  test('returns 400 when scheduled_at is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead1',
        title: 'Demo Call',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Lead ID, title, and scheduled time are required' });
  });

  test('uses default duration of 30 minutes when not provided', async () => {
    mockQuery.mockResolvedValue([{ id: '1', duration_minutes: 30 }]);

    const request = new NextRequest('http://localhost:3000/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead1',
        title: 'Quick Call',
        scheduled_at: '2025-01-15T10:00:00Z',
      }),
    });
    await POST(request);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([30])
    );
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead1',
        title: 'Demo Call',
        scheduled_at: '2025-01-15T10:00:00Z',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to create appointment' });
  });
});
