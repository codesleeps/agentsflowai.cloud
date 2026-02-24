import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    let urlObj: URL;
    try {
      urlObj = new URL(url);
      if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // In a production environment, you would use a library like:
    // - cheerio (for server-side HTML parsing)
    // - puppeteer or playwright (for JavaScript-rendered pages)
    // - @mozilla/readability (for article extraction)
    // - or a third-party service like Diffbot, ScrapingBee, etc.

    // For this implementation, we'll return a mock response
    // In production, replace this with actual fetching logic
    const domain = urlObj.hostname.replace(/^www\./, "");

    const mockResult = {
      url,
      title: `Article from ${domain}`,
      description: `This is a comprehensive article about business growth strategies and marketing automation techniques published on ${domain}.`,
      content: `In today's competitive business landscape, companies are increasingly turning to AI-powered solutions to streamline their operations and drive growth. This article explores the key strategies that successful businesses are implementing to stay ahead of the curve.

Key Highlights:

1. Automation is no longer optional - it's essential for scaling operations efficiently
2. Customer experience should be at the center of every business decision
3. Data-driven insights help identify opportunities and optimize performance
4. Integration across platforms creates a seamless workflow
5. Personalization at scale is achievable with the right tools

The article discusses how small and medium businesses can leverage these strategies without requiring extensive technical expertise or large budgets.`,
      author: "Industry Expert",
      publishDate: new Date().toISOString(),
      keyPoints: [
        "Automation is essential for business scaling",
        "Customer experience drives business success",
        "Data-driven decision making improves outcomes",
        "Platform integration creates efficiency",
        "Personalization is achievable at any scale",
      ],
      topics: ["Business Growth", "Marketing Automation", "AI Technology", "Customer Experience"],
      estimatedReadTime: 5,
      wordCount: 850,
    };

    return NextResponse.json(mockResult);
  } catch (error: any) {
    console.error("Error fetching URL content:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch content" },
      { status: 500 }
    );
  }
}
