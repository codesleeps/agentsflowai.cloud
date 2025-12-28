import { NextRequest, NextResponse } from 'next/server';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';
import type { Conversation } from '@/shared/models/types';
import { ConversationCreateSchema, validateAndSanitize } from '@/lib/validation-schemas';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');
    
    let query = 'SELECT * FROM conversations';
    const params: string[] = [];
    const conditions: string[] = [];
    
    if (leadId) {
      conditions.push(`lead_id = $${params.length + 1}`);
      params.push(leadId);
    }
    
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY started_at DESC LIMIT 50';
    
    const conversations = await queryInternalDatabase(query, params) as unknown as Conversation[];
    return NextResponse.json(conversations);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    await requireAuth(request);

    const body = await request.json();
    
    // Validate input using Zod schema
    const validatedData = validateAndSanitize(ConversationCreateSchema, body);
    
    const result = await queryInternalDatabase(
      `INSERT INTO conversations (lead_id, channel)
       VALUES ($1, $2)
       RETURNING *`,
      [validatedData.lead_id || null, validatedData.channel || 'chat']
    ) as unknown as Conversation[];
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}