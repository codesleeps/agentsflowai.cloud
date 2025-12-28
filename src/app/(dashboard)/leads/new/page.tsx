"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLead } from "@/client-lib/api-client";
import { generateObject } from "@/client-lib/built-in-integrations/ai";
import { toast } from "sonner";
import type { LeadQualificationResult } from "@/shared/models/types";

export default function NewLeadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    source: "website",
    budget: "",
    timeline: "",
    notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAIQualify = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Please enter at least name and email to qualify");
      return;
    }

    setIsQualifying(true);
    try {
      const prompt = `Analyze this lead and provide qualification details:
Name: ${formData.name}
Email: ${formData.email}
Company: ${formData.company || "Not provided"}
Notes: ${formData.notes || "No notes"}

Based on the information, estimate their:
1. Lead score (0-100)
2. Budget category (low, medium, high, enterprise)
3. Timeline (immediate, 1-3months, 3-6months, exploring)
4. Recommended services they might be interested in
5. Suggested next steps for sales team`;

      const result = await generateObject<LeadQualificationResult>(prompt, {
        type: "object",
        properties: {
          score: { type: "number", minimum: 0, maximum: 100 },
          budget: { type: "string", enum: ["low", "medium", "high", "enterprise"] },
          timeline: { type: "string", enum: ["immediate", "1-3months", "3-6months", "exploring"] },
          recommendedServices: { type: "array", items: { type: "string" } },
          nextSteps: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["score", "budget", "timeline", "summary"],
      });

      setFormData((prev) => ({
        ...prev,
        budget: result.budget || prev.budget,
        timeline: result.timeline || prev.timeline,
        notes: prev.notes
          ? `${prev.notes}\n\n---\nAI Analysis:\n${result.summary}\n\nRecommended Services: ${result.recommendedServices?.join(", ") || "N/A"}\nNext Steps: ${result.nextSteps?.join(", ") || "N/A"}`
          : `AI Analysis:\n${result.summary}\n\nRecommended Services: ${result.recommendedServices?.join(", ") || "N/A"}\nNext Steps: ${result.nextSteps?.join(", ") || "N/A"}`,
      }));

      toast.success(`Lead qualified with score: ${result.score}/100`);
    } catch (error) {
      console.error("Error qualifying lead:", error);
      toast.error("Failed to qualify lead with AI");
    } finally {
      setIsQualifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createLead({
        name: formData.name,
        email: formData.email,
        company: formData.company || undefined,
        phone: formData.phone || undefined,
        source: formData.source,
        budget: formData.budget || undefined,
        timeline: formData.timeline || undefined,
        notes: formData.notes || undefined,
      });
      toast.success("Lead created successfully");
      router.push("/leads");
    } catch (error) {
      console.error("Error creating lead:", error);
      toast.error("Failed to create lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col p-6 gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Add New Lead
          </h1>
          <p className="text-muted-foreground mt-1">
            Enter lead information and optionally qualify with AI
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
            <CardDescription>Enter the basic information about the lead</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    placeholder="Acme Inc."
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Lead Source</Label>
                  <Select value={formData.source} onValueChange={(v) => handleSelectChange("source", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">🌐 Website</SelectItem>
                      <SelectItem value="chat">💬 Chat</SelectItem>
                      <SelectItem value="referral">🤝 Referral</SelectItem>
                      <SelectItem value="ads">📢 Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget</Label>
                  <Select value={formData.budget} onValueChange={(v) => handleSelectChange("budget", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (&lt;$1,000)</SelectItem>
                      <SelectItem value="medium">Medium ($1,000-$5,000)</SelectItem>
                      <SelectItem value="high">High ($5,000-$10,000)</SelectItem>
                      <SelectItem value="enterprise">Enterprise ($10,000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="timeline">Timeline</Label>
                  <Select value={formData.timeline} onValueChange={(v) => handleSelectChange("timeline", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="When do they need this?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (ASAP)</SelectItem>
                      <SelectItem value="1-3months">1-3 Months</SelectItem>
                      <SelectItem value="3-6months">3-6 Months</SelectItem>
                      <SelectItem value="exploring">Just Exploring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Add any additional notes about this lead..."
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Lead
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/leads">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Qualification
            </CardTitle>
            <CardDescription>Let AI analyze and qualify this lead automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the button below to have AI analyze the lead information and provide:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Lead score (0-100)</li>
              <li>Budget estimation</li>
              <li>Timeline assessment</li>
              <li>Service recommendations</li>
              <li>Next steps for sales</li>
            </ul>
            <Button
              type="button"
              className="w-full"
              onClick={handleAIQualify}
              disabled={isQualifying || !formData.name || !formData.email}
            >
              {isQualifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Qualify with AI
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Requires at least name and email</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
