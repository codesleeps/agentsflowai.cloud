import { NextRequest, NextResponse } from 'next/server';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';
import type { Lead } from '@/shared/models/types';
import { LeadCreateSchema, PaginationSchema, validateAndSanitize } from '@/lib/validation-schemas';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;

    // Validate query parameters
    const queryParams = {
      status: searchParams.get('status') || undefined,
      source: searchParams.get('source') || undefined,
      limit: searchParams.get('limit') || undefined,
      page: searchParams.get('page') || undefined,
      search: searchParams.get('search') || undefined
    };

    const validatedParams = PaginationSchema.parse(queryParams);

    let query = 'SELECT * FROM leads';
    const params: string[] = [];
    const conditions: string[] = [];

    if (validatedParams.status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(validatedParams.status);
    }

    if (validatedParams.source) {
      conditions.push(`source = $${params.length + 1}`);
      params.push(validatedParams.source);
    }

    if (validatedParams.search) {
      conditions.push(`(name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 2} OR company ILIKE $${params.length + 3})`);
      const searchPattern = `%${validatedParams.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC`;

    if (validatedParams.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(validatedParams.limit.toString());
    }

    const leads = await queryInternalDatabase(query, params) as unknown as Lead[];
    return NextResponse.json(leads);
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
    const validatedData = validateAndSanitize(LeadCreateSchema, body);

    const result = await queryInternalDatabase(
      `INSERT INTO leads (name, email, company, phone, source, budget, timeline, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        validatedData.name,
        validatedData.email,
        validatedData.company || null,
        validatedData.phone || null,
        validatedData.source,
        validatedData.budget || null,
        validatedData.timeline || null,
        validatedData.notes || null
      ]
    ) as unknown as Lead[];

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}