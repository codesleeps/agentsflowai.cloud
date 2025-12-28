import { NextRequest, NextResponse } from 'next/server';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';
import type { Lead } from '@/shared/models/types';
import { LeadUpdateSchema, validateAndSanitize } from '@/lib/validation-schemas';
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
      return NextResponse.json({ error: 'Invalid lead ID format' }, { status: 400 });
    }
    
    const leads = await queryInternalDatabase(
      'SELECT * FROM leads WHERE id = $1',
      [id]
    ) as unknown as Lead[];
    
    if (leads.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    
    return NextResponse.json(leads[0]);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    await requireAuth(request);

    const { id } = await params;
    
    // Validate UUID format
    if (!uuidv4.validate(id)) {
      return NextResponse.json({ error: 'Invalid lead ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Validate input using Zod schema
    const validatedData = validateAndSanitize(LeadUpdateSchema, body);
    
    const updates: string[] = [];
    const values: (string | number | null | string[])[] = [];
    let paramIndex = 1;
    
    if (validatedData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(validatedData.name);
    }
    if (validatedData.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(validatedData.email);
    }
    if (validatedData.company !== undefined) {
      updates.push(`company = $${paramIndex++}`);
      values.push(validatedData.company);
    }
    if (validatedData.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(validatedData.phone);
    }
    if (validatedData.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(validatedData.status);
      if (validatedData.status === 'qualified') {
        updates.push(`qualified_at = CURRENT_TIMESTAMP`);
      }
    }
    if (validatedData.score !== undefined) {
      updates.push(`score = $${paramIndex++}`);
      values.push(validatedData.score);
    }
    if (validatedData.budget !== undefined) {
      updates.push(`budget = $${paramIndex++}`);
      values.push(validatedData.budget);
    }
    if (validatedData.timeline !== undefined) {
      updates.push(`timeline = $${paramIndex++}`);
      values.push(validatedData.timeline);
    }
    if (validatedData.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(validatedData.notes);
    }
    if (validatedData.interests !== undefined) {
      updates.push(`interests = $${paramIndex++}`);
      values.push(JSON.stringify(validatedData.interests));
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const result = await queryInternalDatabase(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    ) as unknown as Lead[];
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    await requireAuth(request);

    const { id } = await params;
    
    // Validate UUID format
    if (!uuidv4.validate(id)) {
      return NextResponse.json({ error: 'Invalid lead ID format' }, { status: 400 });
    }
    
    const result = await queryInternalDatabase(
      'DELETE FROM leads WHERE id = $1 RETURNING *',
      [id]
    ) as unknown as Lead[];
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}