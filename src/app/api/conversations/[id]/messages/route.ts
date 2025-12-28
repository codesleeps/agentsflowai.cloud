import { NextRequest, NextResponse } from 'next/server';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';
import type { Message } from '@/shared/models/types';
import { MessageCreateSchema, validateAndSanitize } from '@/lib/validation-schemas';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-errors';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    await requireAuth(request);

    const { id } = await params;
    
    // Validate UUID format
    if (!uuidv4.validate(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID format' }, { status: 400 });
    }
    
    const messages = await queryInternalDatabase(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [id]
    ) as unknown as Message[];
    
    return NextResponse.json(messages);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    await requireAuth(request);

    const { id } = await params;
    
    // Validate UUID format
    if (!uuidv4.validate(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Validate input using Zod schema
    const validatedData = validateAndSanitize(MessageCreateSchema, body);
    
    const result = await queryInternalDatabase(
      `INSERT INTO messages (conversation_id, role, content, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, validatedData.role, validatedData.content, JSON.stringify(validatedData.metadata || {})]
    ) as unknown as Message[];
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}