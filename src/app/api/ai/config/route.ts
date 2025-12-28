
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { prisma as db } from '@/server-lib/prisma';
import { handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

const ModelConfigSchema = z.object({
    agentId: z.string(),
    primaryProvider: z.string(),
    primaryModel: z.string(),
    fallbackChain: z.array(z.object({
        provider: z.string(),
        model: z.string(),
        priority: z.number(),
    })),
});

export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('agentId');

        const whereClause = agentId
            ? { user_id: user.id, agent_id: agentId }
            : { user_id: user.id };

        const config = await db.aIModelConfig.findMany({ where: whereClause });

        return NextResponse.json(config);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validatedData = ModelConfigSchema.parse(body);

        const { agentId, primaryProvider, primaryModel, fallbackChain } = validatedData;

        const updatedConfig = await db.aIModelConfig.upsert({
            where: {
                user_id_agent_id: {
                    user_id: user.id,
                    agent_id: agentId,
                }
            },
            update: {
                primary_provider: primaryProvider,
                primary_model: primaryModel,
                fallback_chain: fallbackChain,
            },
            create: {
                user_id: user.id,
                agent_id: agentId,
                primary_provider: primaryProvider,
                primary_model: primaryModel,
                fallback_chain: fallbackChain,
            },
        });

        return NextResponse.json(updatedConfig);
    } catch (error) {
        return handleApiError(error);
    }
}
