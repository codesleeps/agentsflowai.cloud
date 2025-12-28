import { NextRequest, NextResponse } from 'next/server';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';
import type { Appointment } from '@/shared/models/types';
import { AppointmentCreateSchema, validateAndSanitize } from '@/lib/validation-schemas';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming');
    
    let query = 'SELECT * FROM appointments';
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
    
    if (upcoming === 'true') {
      conditions.push('scheduled_at > NOW()');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY scheduled_at ASC LIMIT 50';
    
    const appointments = await queryInternalDatabase(query, params) as unknown as Appointment[];
    return NextResponse.json(appointments);
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
    const validatedData = validateAndSanitize(AppointmentCreateSchema, body);
    
    const result = await queryInternalDatabase(
      `INSERT INTO appointments (lead_id, title, description, scheduled_at, duration_minutes, meeting_link, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        validatedData.lead_id,
        validatedData.title,
        validatedData.description || null,
        validatedData.scheduled_at,
        validatedData.duration_minutes || 30,
        validatedData.meeting_link || null,
        validatedData.notes || null
      ]
    ) as unknown as Appointment[];
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}