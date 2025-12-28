
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/api-errors';
import { getUserUsageStats } from '@/server-lib/ai-usage-tracker';
import { z } from 'zod';

const UsageQuerySchema = z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
});

export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = {
            startDate: searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: searchParams.get('endDate') || new Date().toISOString(),
        }

        const validatedQuery = UsageQuerySchema.parse(query);

        const usageStats = await getUserUsageStats(user.id, validatedQuery);

        return NextResponse.json(usageStats);
    } catch (error) {
        return handleApiError(error);
    }
}
