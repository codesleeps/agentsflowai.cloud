"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  Copy,
  Check,
  TrendingUp,
  Target,
  Globe,
  FileText,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { generateAgentResponse } from "@/client-lib/ai-agents-client";
import { toast } from "sonner";

export default function SEOAgentPage() {
  const [activeTab, setActiveTab] = useState("keywords");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState("");
  
  // Keywords state
  const [seedKeyword, setSeedKeyword] = useState("");
  const [industry, setIndustry] = useState("");
  
  // Meta tags state
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  
  // Content audit state
  const [contentToAudit, setContentToAudit] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");

  const handleKeywordResearch = async () => {
    if (!seedKeyword.trim()) {
      toast.error("Please enter a seed keyword");
      return;
    }

    setIsLoading(true);
    setResults("");

    try {
      const prompt = `Perform keyword research for: "${seedKeyword}"
${industry ? `Industry: ${industry}` : ""}

Provide:
1. **Primary Keywords** (5-10 high-value keywords)
   - Search intent (informational, commercial, transactional)
   - Estimated difficulty (low, medium, high)
   - Suggested content type

2. **Long-tail Keywords** (10-15 variations)
   - Lower competition alternatives
   - Question-based keywords
   - Location-based if relevant

3. **Related Topics** (5-8 topic clusters)
   - Supporting content ideas
   - Internal linking opportunities

4. **Content Strategy Recommendations**
   - Pillar page suggestions
   - Blog post ideas
   - Quick win opportunities

Format with clear sections and bullet points.`;

      const response = await generateAgentResponse("seo-agent", prompt);
      setResults(response.response);
      toast.success("Keyword research complete!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to generate keyword research");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetaTagGeneration = async () => {
    if (!pageTitle.trim()) {
      toast.error("Please enter a page title or topic");
      return;
    }

    setIsLoading(true);
    setResults("");

    try {
      const prompt = `Generate SEO-optimized meta tags for a page about: "${pageTitle}"
${pageDescription ? `Additional context: ${pageDescription}` : ""}

Provide:
1. **Title Tag Options** (3 variations)
   - Keep under 60 characters
   - Include primary keyword
   - Make it compelling

2. **Meta Description Options** (3 variations)
   - 150-160 characters
   - Include call-to-action
   - Feature unique value proposition

3. **Open Graph Tags**
   - og:title
   - og:description
   - og:type

4. **Twitter Card Tags**
   - twitter:title
   - twitter:description

5. **Schema.org Suggestions**
   - Recommended schema type
   - Key properties to include

6. **Header Structure**
   - Suggested H1
   - H2 subheadings (5-7)

Format as ready-to-use HTML snippets where applicable.`;

      const response = await generateAgentResponse("seo-agent", prompt);
      setResults(response.response);
      toast.success("Meta tags generated!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to generate meta tags");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentAudit = async () => {
    if (!contentToAudit.trim()) {
      toast.error("Please enter content to audit");
      return;
    }

    setIsLoading(true);
    setResults("");

    try {
      const keywordList = targetKeywords.split(",").map((k) => k.trim()).filter(Boolean);
      
      const prompt = `Perform an SEO audit on this content:

"""
${contentToAudit.substring(0, 3000)}
"""

${keywordList.length > 0 ? `Target Keywords: ${keywordList.join(", ")}` : ""}

Analyze and provide:

1. **SEO Score** (0-100)
   - Overall assessment

2. **Keyword Analysis**
   - Keyword density
   - Keyword placement (title, headings, first paragraph)
   - Missing keyword opportunities

3. **Content Structure**
   - Heading hierarchy assessment
   - Paragraph length
   - Readability score

4. **On-Page SEO Checklist**
   ✅ or ❌ for each item:
   - Title optimization
   - Meta description
   - Header tags (H1, H2, H3)
   - Internal links
   - External links
   - Image optimization opportunities
   - URL structure

5. **Content Improvements**
   - Specific recommendations
   - Missing topics to cover
   - Ways to increase depth

6. **Technical Suggestions**
   - Schema markup opportunities
   - Core Web Vitals considerations

7. **Priority Actions**
   - Top 5 things to fix first`;

      const response = await generateAgentResponse("seo-agent", prompt);
      setResults(response.response);
      toast.success("Content audit complete!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to audit content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(results);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="flex flex-1 flex-col p-6 gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ai-agents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Search className="h-8 w-8 text-cyan-500" />
            SEO Agent
          </h1>
          <p className="text-muted-foreground mt-1">
            Keyword research, meta tags, and content optimization
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="keywords">
                  <Target className="h-4 w-4 mr-2" />
                  Keywords
                </TabsTrigger>
                <TabsTrigger value="meta">
                  <Globe className="h-4 w-4 mr-2" />
                  Meta Tags
                </TabsTrigger>
                <TabsTrigger value="audit">
                  <FileText className="h-4 w-4 mr-2" />
                  Audit
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Keyword Research */}
              <TabsContent value="keywords" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="seed-keyword">Seed Keyword *</Label>
                  <Input
                    id="seed-keyword"
                    placeholder="e.g., digital marketing"
                    value={seedKeyword}
                    onChange={(e) => setSeedKeyword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry / Niche</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., SaaS, E-commerce, Healthcare"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleKeywordResearch}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Target className="h-4 w-4 mr-2" />
                  )}
                  Research Keywords
                </Button>
              </TabsContent>

              {/* Meta Tag Generation */}
              <TabsContent value="meta" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="page-title">Page Title / Topic *</Label>
                  <Input
                    id="page-title"
                    placeholder="e.g., Ultimate Guide to SEO in 2024"
                    value={pageTitle}
                    onChange={(e) => setPageTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-desc">Page Description / Context</Label>
                  <Textarea
                    id="page-desc"
                    placeholder="Brief description of the page content..."
                    value={pageDescription}
                    onChange={(e) => setPageDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleMetaTagGeneration}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4 mr-2" />
                  )}
                  Generate Meta Tags
                </Button>
              </TabsContent>

              {/* Content Audit */}
              <TabsContent value="audit" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="content">Content to Audit *</Label>
                  <Textarea
                    id="content"
                    placeholder="Paste your content here for SEO analysis..."
                    value={contentToAudit}
                    onChange={(e) => setContentToAudit(e.target.value)}
                    rows={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-kw">Target Keywords (comma separated)</Label>
                  <Input
                    id="target-kw"
                    placeholder="seo, search engine optimization, ranking"
                    value={targetKeywords}
                    onChange={(e) => setTargetKeywords(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleContentAudit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Audit Content
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Results</CardTitle>
              <CardDescription>SEO analysis and recommendations</CardDescription>
            </div>
            {results && (
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {isLoading ? (
              <div className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-cyan-500" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Analyzing...
                  </p>
                </div>
              </div>
            ) : results ? (
              <Textarea
                value={results}
                onChange={(e) => setResults(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
              />
            ) : (
              <div className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select a tool and run analysis
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            SEO Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500 mb-2" />
              <p className="font-medium text-sm">Title Tags</p>
              <p className="text-xs text-muted-foreground">Keep under 60 characters, include primary keyword near the beginning</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500 mb-2" />
              <p className="font-medium text-sm">Meta Descriptions</p>
              <p className="text-xs text-muted-foreground">150-160 characters, include CTA and unique value proposition</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500 mb-2" />
              <p className="font-medium text-sm">Header Structure</p>
              <p className="text-xs text-muted-foreground">Use one H1, logical H2-H6 hierarchy, include keywords naturally</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500 mb-2" />
              <p className="font-medium text-sm">Content Length</p>
              <p className="text-xs text-muted-foreground">Aim for 1,500+ words for pillar content, cover topics comprehensively</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
