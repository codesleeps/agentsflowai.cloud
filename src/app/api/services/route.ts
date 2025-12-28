import { NextRequest, NextResponse } from 'next/server';
import { queryInternalDatabase } from '@/server-lib/internal-db-query';
import type { Service } from '@/shared/models/types';
import { ServiceCreateSchema, validateAndSanitize } from '@/lib/validation-schemas';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-errors';

export async function GET() {
  try {
    const services = await queryInternalDatabase(
      'SELECT * FROM services WHERE is_active = true ORDER BY price ASC'
    ) as unknown as Service[];
    
    // Parse features from JSON string to array
    const parsedServices = services.map(service => ({
      ...service,
      features: typeof service.features === 'string'
        ? JSON.parse(service.features)
        : service.features
    }));
    
    return NextResponse.json(parsedServices);
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
    const validatedData = validateAndSanitize(ServiceCreateSchema, body);
    
    const result = await queryInternalDatabase(
      `INSERT INTO services (name, description, tier, price, features)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        validatedData.name,
        validatedData.description || null,
        validatedData.tier,
        validatedData.price,
        JSON.stringify(validatedData.features || [])
      ]
    ) as unknown as Service[];
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}