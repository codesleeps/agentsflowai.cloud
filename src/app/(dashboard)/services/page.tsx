"use client";

import { Package, Check, Star, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const tierColors: Record<string, string> = {
  basic: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  growth:
    "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  enterprise:
    "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
};

const tierIcons: Record<string, React.ReactNode> = {
  basic: <Package className="h-6 w-6" />,
  growth: <Sparkles className="h-6 w-6" />,
  enterprise: <Star className="h-6 w-6" />,
};

// Predefined service packages
const SERVICE_PACKAGES = [
  {
    id: "basic",
    name: "Basic Package",
    description: "Perfect for getting started with essential features",
    tier: "basic" as const,
    price: 99,
    features: [
      "Up to 1,000 leads per month",
      "Basic lead scoring",
      "Email notifications",
      "Standard support",
      "Basic analytics dashboard",
    ],
  },
  {
    id: "growth",
    name: "Growth Package",
    description: "Ideal for growing businesses with advanced features",
    tier: "growth" as const,
    price: 299,
    features: [
      "Up to 10,000 leads per month",
      "Advanced lead scoring with AI",
      "Priority email & chat support",
      "Custom workflows automation",
      "Advanced analytics & reporting",
      "Lead enrichment (up to 500/month)",
      "Integration with popular CRM tools",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise Package",
    description: "Complete solution for large organizations",
    tier: "enterprise" as const,
    price: 999,
    features: [
      "Unlimited leads",
      "AI-powered lead scoring & insights",
      "Dedicated account manager",
      "Custom integrations & API access",
      "Advanced team collaboration tools",
      "Unlimited lead enrichment",
      "White-label solutions",
      "SLA guarantees & premium support",
      "Custom feature development",
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Package className="h-8 w-8 text-primary" />
            Services & Packages
          </h1>
          <p className="mt-1 text-muted-foreground">
            Choose the perfect plan for your business needs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SERVICE_PACKAGES.map((service) => (
          <Card key={service.id} className="relative overflow-hidden">
            {service.tier === "enterprise" && (
              <div className="absolute right-0 top-0 rounded-bl-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                Most Popular
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-2 ${tierColors[service.tier]}`}>
                  {tierIcons[service.tier]}
                </div>
                <Badge variant="outline" className={tierColors[service.tier]}>
                  {service.tier}
                </Badge>
              </div>
              <CardTitle className="mt-4">{service.name}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ${service.price.toLocaleString()}
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3">
                {service.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={service.tier === "enterprise" ? "default" : "outline"}
              >
                Get Started
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
