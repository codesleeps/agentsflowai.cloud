import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getRecentDiagnostics } from "@/server-lib/ai-usage-tracker";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Max 100
    const provider = searchParams.get("provider");

    const diagnostics = await getRecentDiagnostics(limit);

    // Filter by provider if specified
    const filteredDiagnostics = provider
      ? diagnostics.filter(d => d.provider === provider)
      : diagnostics;

    return NextResponse.json(filteredDiagnostics);
  } catch (error) {
    console.error("Error fetching diagnostics:", error);
    return NextResponse.json(
      { error: "Failed to fetch diagnostics" },
      { status: 500 }
    );
  }
}