/**
 * Unit tests for Conversations API
 * 
 * Tests the /api/conversations endpoint for:
 * - GET: Fetching conversations with filters
 * - POST: Creating new conversations
 */

import { NextRequest } from 'next/server';

// Mock the database module
jest.mock('@/server-lib/internal-db-query', () => ({
  queryInternalDatabase: jest.fn(),
}));

import { GET, POST } from '../conversations/route';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';

const mockQuery = queryInternalDatabase as jest.MockedFunction<typeof queryInternalDatabase>;

describe('GET /api/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches all conversations without filters', async () => {
    const mockConversations = [
      { id: '1', lead_id: 'lead1', status: 'active', channel: 'chat' },
      { id: '2', lead_id: 'lead2', status: 'closed', channel: 'email' },
    ];
    mockQuery.mockResolvedValue(mockConversations);

    const request = new NextRequest('http://localhost:3000/api/conversations');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockConversations);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM conversations'),
      []
    );
  });

  test('filters conversations by leadId', async () => {
    const mockConversations = [
      { id: '1', lead_id: 'lead1', status: 'active', channel: 'chat' },
    ];
    mockQuery.mockResolvedValue(mockConversations);

    const request = new NextRequest('http://localhost:3000/api/conversations?leadId=lead1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockConversations);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('lead_id = $1'),
      ['lead1']
    );
  });

  test('filters conversations by status', async () => {
    const mockConversations = [
      { id: '1', lead_id: 'lead1', status: 'active', channel: 'chat' },
    ];
    mockQuery.mockResolvedValue(mockConversations);

    const request = new NextRequest('http://localhost:3000/api/conversations?status=active');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('status = $1'),
      ['active']
    );
  });

  test('combines leadId and status filters', async () => {
    mockQuery.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/conversations?leadId=lead1&status=active');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringMatching(/lead_id = \$1.*AND.*status = \$2/s),
      ['lead1', 'active']
    );
  });

  test('returns empty array when no conversations exist', async () => {
    mockQuery.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/conversations');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/conversations');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch conversations' });
  });
});

describe('POST /api/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a conversation with default channel', async () => {
    const newConversation = {
      id: '1',
      lead_id: null,
      channel: 'chat',
      status: 'active',
    };
    mockQuery.mockResolvedValue([newConversation]);

    const request = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(newConversation);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO conversations'),
      [null, 'chat']
    );
  });

  test('creates a conversation with lead_id', async () => {
    const newConversation = {
      id: '1',
      lead_id: 'lead1',
      channel: 'chat',
    };
    mockQuery.mockResolvedValue([newConversation]);

    const request = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead1' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['lead1', 'chat']
    );
  });

  test('creates a conversation with custom channel', async () => {
    const newConversation = {
      id: '1',
      lead_id: null,
      channel: 'email',
    };
    mockQuery.mockResolvedValue([newConversation]);

    const request = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ channel: 'email' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [null, 'email']
    );
  });

  test('creates a conversation with both lead_id and channel', async () => {
    const newConversation = {
      id: '1',
      lead_id: 'lead1',
      channel: 'phone',
    };
    mockQuery.mockResolvedValue([newConversation]);

    const request = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead1', channel: 'phone' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['lead1', 'phone']
    );
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to create conversation' });
  });
});
