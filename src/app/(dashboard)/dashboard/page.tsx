"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Users,
  TrendingUp,
  Calendar,
  MessageSquare,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Target,
  Zap,
  Code,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAuthClient } from "@/client-lib/auth-client";
import { useDashboardStats } from "@/client-lib/api-client";

const statusColors: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  qualified: "bg-green-500",
  proposal: "bg-purple-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

const sourceIcons: Record<string, string> = {
  website: "🌐",
  chat: "💬",
  referral: "🤝",
  ads: "📢",
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: stats, isLoading } = useDashboardStats();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check authentication
    const auth = getAuthClient();
    if (auth.data?.user) {
      setIsAuthenticated(true);
    } else {
      // Redirect to welcome if not authenticated
      router.replace("/welcome");
    }
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Bot className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Bot className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Sparkles className="h-8 w-8 text-primary" />
            AgentsFlowAI
          </h1>
          <p className="mt-1 text-muted-foreground">
            AI-Powered Business Automation Dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/chat">
              <MessageSquare className="mr-2 h-4 w-4" />
              AI Chat Agent
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/leads">
              <Users className="mr-2 h-4 w-4" />
              Manage Leads
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads ?? 0}</div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {stats?.monthlyGrowth && (
                <>
                  <ArrowUpRight
                    className={`h-3 w-3 ${
                      stats.monthlyGrowth.percentage >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  />
                  <span
                    className={
                      stats.monthlyGrowth.percentage >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {stats.monthlyGrowth.percentage >= 0 ? "+" : ""}
                    {stats.monthlyGrowth.percentage}%
                  </span>
                </>
              )}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Qualified Leads
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.qualifiedLeads ?? 0}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-primary">
                {stats?.conversionRate ?? 0}%
              </span>{" "}
              conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeConversations ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              AI agents handling inquiries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.revenue ?? 0).toLocaleString()}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+23%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      {(stats?.aiUsage || stats?.emailMetrics) && (
        <div className="grid gap-4 md:grid-cols-3">
          {stats?.aiUsage && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  AI Requests
                </CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.aiUsage.requestsThisMonth.toLocaleString()}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          )}

          {stats?.emailMetrics && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Email Open Rate
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.emailMetrics.openRate}%
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stats.emailMetrics.totalOpened.toLocaleString()} opened
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Appointments
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.upcomingAppointments ?? 0}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Upcoming</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* AI Agents Status */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Agents
            </CardTitle>
            <CardDescription>Active automation agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 p-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="font-medium">Chat Agent</span>
              </div>
              <Badge
                variant="secondary"
                className="bg-green-500/20 text-green-700 dark:text-green-400"
              >
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 p-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="font-medium">Lead Qualifier</span>
              </div>
              <Badge
                variant="secondary"
                className="bg-green-500/20 text-green-700 dark:text-green-400"
              >
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 p-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="font-medium">Service Recommender</span>
              </div>
              <Badge
                variant="secondary"
                className="bg-green-500/20 text-green-700 dark:text-green-400"
              >
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                <span className="font-medium">Web Developer</span>
              </div>
              <Badge
                variant="secondary"
                className="bg-blue-500/20 text-blue-700 dark:text-blue-400"
              >
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="font-medium">Analytics Agent</span>
              </div>
              <Badge
                variant="secondary"
                className="bg-purple-500/20 text-purple-700 dark:text-purple-400"
              >
                Standby
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Lead Pipeline */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Lead Pipeline
            </CardTitle>
            <CardDescription>Leads by status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.leadsByStatus?.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {item.status}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {item.count}
                  </span>
                </div>
                <Progress
                  value={(item.count / (stats.totalLeads || 1)) * 100}
                  className={`h-2 ${statusColors[item.status] || "bg-gray-500"}`}
                />
              </div>
            ))}
            {(!stats?.leadsByStatus || stats.leadsByStatus.length === 0) && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No leads yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Lead Sources
            </CardTitle>
            <CardDescription>Where leads come from</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.leadsBySource?.map((item) => (
              <div
                key={item.source}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {sourceIcons[item.source] || "📊"}
                  </span>
                  <span className="font-medium capitalize">{item.source}</span>
                </div>
                <Badge variant="outline">{item.count}</Badge>
              </div>
            ))}
            {(!stats?.leadsBySource || stats.leadsBySource.length === 0) && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No source data yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Recent Leads
              </CardTitle>
              <CardDescription>Latest incoming leads</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/leads">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentLeads?.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-semibold text-primary">
                        {lead.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lead.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right md:block">
                      <p className="text-sm font-medium">
                        {lead.company || "No company"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Score: {lead.score}/100
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`${statusColors[lead.status]}/20 capitalize`}
                    >
                      {lead.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!stats?.recentLeads || stats.recentLeads.length === 0) && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No leads yet. Start by creating one or using the AI Chat
                  Agent.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/chat">
                <MessageSquare className="mr-2 h-4 w-4" />
                Start AI Conversation
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/leads/new">
                <Users className="mr-2 h-4 w-4" />
                Add New Lead
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/services">
                <Target className="mr-2 h-4 w-4" />
                Manage Services
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/analytics">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/ai-agents">
                <Code className="mr-2 h-4 w-4" />
                Web Developer Agent
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/appointments">
                <Calendar className="mr-2 h-4 w-4" />
                Appointments
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
