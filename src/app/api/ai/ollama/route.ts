import { NextRequest, NextResponse } from "next/server";
import { getQueueStatus } from "@/server-lib/ollama-utils";

export async function GET(request: NextRequest) {
  try {
    const status = getQueueStatus();
    
    return NextResponse.json(status);
  } catch (error) {
    console.error("[Ollama Queue API] Error getting queue status:", error);
    return NextResponse.json(
      { error: "Failed to get queue status" },
      { status: 500 }
    );
  }
}
