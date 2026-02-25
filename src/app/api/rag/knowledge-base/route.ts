/**
 * Knowledge Base API Routes
 * POST: Create new knowledge base
 * GET: List user's knowledge bases
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import {
  createKnowledgeBase,
  getUserKnowledgeBases,
} from "@/lib/ai/rag/rag-service";

// POST /api/rag/knowledge-base - Create new knowledge base
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const knowledgeBase = await createKnowledgeBase(
      user.id,
      name.trim(),
      description?.trim()
    );

    return NextResponse.json({ knowledgeBase }, { status: 201 });
  } catch (error) {
    console.error("Error creating knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to create knowledge base" },
      { status: 500 }
    );
  }
}

// GET /api/rag/knowledge-base - List user's knowledge bases
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const knowledgeBases = await getUserKnowledgeBases(user.id);

    return NextResponse.json({ knowledgeBases });
  } catch (error) {
    console.error("Error fetching knowledge bases:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge bases" },
      { status: 500 }
    );
  }
}
