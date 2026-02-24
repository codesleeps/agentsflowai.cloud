/**
 * URL Content Research Utility
 * Fetches and analyzes content from URLs for marketing purposes
 */

export interface URLResearchResult {
  url: string;
  title: string;
  description: string;
  content: string;
  author?: string;
  publishDate?: string;
  keyPoints: string[];
  topics: string[];
  estimatedReadTime: number;
  wordCount: number;
}

export interface URLAnalysis {
  url: string;
  isValid: boolean;
  error?: string;
  content?: URLResearchResult;
}

/**
 * Validates if a string is a valid URL
 */
export function isValidURL(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extracts domain from URL for display
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Fetches content from a URL (server-side only)
 * This would typically call an API endpoint that uses a fetch library
 */
export async function fetchURLContent(url: string): Promise<URLAnalysis> {
  if (!isValidURL(url)) {
    return {
      url,
      isValid: false,
      error: "Invalid URL format. Please enter a valid http:// or https:// URL.",
    };
  }

  try {
    // In a real implementation, this would call your API endpoint
    // that uses a server-side fetch library like cheerio, puppeteer, etc.
    const response = await fetch("/api/marketing/fetch-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        url,
        isValid: false,
        error: error.message || "Failed to fetch content from URL",
      };
    }

    const data = await response.json();
    return {
      url,
      isValid: true,
      content: data,
    };
  } catch (error) {
    return {
      url,
      isValid: false,
      error: "Network error. Please check your connection and try again.",
    };
  }
}

/**
 * Simulates fetching content from a URL (for demo/testing)
 * Returns mock data that looks realistic
 */
export async function simulateFetchURLContent(url: string): Promise<URLAnalysis> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (!isValidURL(url)) {
    return {
      url,
      isValid: false,
      error: "Invalid URL format. Please enter a valid http:// or https:// URL.",
    };
  }

  const domain = extractDomain(url);

  // Generate mock content based on URL
  const mockResult: URLResearchResult = {
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

The article discusses how small and medium businesses can leverage these strategies without requiring extensive technical expertise or large budgets. By focusing on the right priorities and using modern tools, any business can achieve significant improvements in efficiency and customer satisfaction.

Case studies from various industries demonstrate the real-world impact of these approaches, showing measurable results in terms of revenue growth, customer retention, and operational efficiency.`,
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

  return {
    url,
    isValid: true,
    content: mockResult,
  };
}

/**
 * Analyzes URL content and suggests marketing angles
 */
export function analyzeContentForMarketing(content: URLResearchResult): {
  suggestedTopics: string[];
  contentAngles: string[];
  targetAudiences: string[];
  platforms: string[];
} {
  return {
    suggestedTopics: content.topics.map((t) => `${t} - Deep Dive`),
    contentAngles: [
      "How to implement these strategies",
      "Common mistakes to avoid",
      "Success stories and case studies",
      "Tools and resources needed",
      "ROI and measurable outcomes",
    ],
    targetAudiences: [
      "Small business owners",
      "Marketing managers",
      "Startup founders",
      "Growth hackers",
      "Digital marketers",
    ],
    platforms: ["LinkedIn", "Twitter", "Blog", "Email Newsletter"],
  };
}

/**
 * Generates a summary suitable for social media
 */
export function generateSocialSummary(content: URLResearchResult, platform: string): string {
  const summaries: Record<string, string> = {
    linkedin: `🚀 ${content.title}\n\nKey insights from ${extractDomain(content.url)}:\n${content.keyPoints.slice(0, 3).map((p) => `• ${p}`).join("\n")}\n\nWhat's your experience with these strategies? Share in the comments! 👇`,
    twitter: `🧵 ${content.title}\n\nJust read an amazing article from ${extractDomain(content.url)}. Here are the key takeaways:\n\n1/ ${content.keyPoints[0]}\n\n2/ ${content.keyPoints[1]}\n\n3/ ${content.keyPoints[2]}\n\nThread 🧵👇`,
    instagram: `✨ ${content.title}\n\nSwipe to learn the key insights from this article →\n\n💡 Save this for later!\n\n👇 Which point resonated with you most?`,
  };

  return summaries[platform] || content.description;
}
