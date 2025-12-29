"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  Zap,
  ArrowLeft,
  Bot,
  Calendar,
  Filter,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUserAIAgents } from "@/client-lib/user-ai-agents-client";
import { useComprehensiveAnalytics } from "@/client-lib/api-client";
import { Progress } from "@/components/ui/progress";

export default function AIAgentAnalyticsPage() {
  const { data: agents, isLoading: agentsLoading } = useUserAIAgents();
  const { data: analytics, isLoading: analyticsLoading } =
    useComprehensiveAnalytics();
  const [timeRange, setTimeRange] = useState("30d");

  const isLoading = agentsLoading || analyticsLoading;

  // Filter agents that have usage data
  const activeAgents = agents?.filter((agent) => agent.usage_count > 0) || [];

  // Calculate analytics
  const totalAgentInteractions = activeAgents.reduce(
    (sum, agent) => sum + agent.usage_count,
    0,
  );
  const totalActiveAgents = activeAgents.length;
  const avgInteractionsPerAgent =
    totalActiveAgents > 0
      ? Math.round(totalAgentInteractions / totalActiveAgents)
      : 0;

  // Get top performing agents
  const topAgents = activeAgents
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5);

  // Calculate category distribution
  const categoryStats = activeAgents.reduce(
    (acc, agent) => {
      acc[agent.category] = (acc[agent.category] || 0) + agent.usage_count;
      return acc;
    },
    {} as Record<string, number>,
  );

  const categoryData = Object.entries(categoryStats).map(
    ([category, usage]) => ({
      category: category
        .replace("-", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      usage,
      percentage:
        totalAgentInteractions > 0
          ? Math.round((usage / totalAgentInteractions) * 100)
          : 0,
    }),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/ai-agents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <BarChart3 className="h-8 w-8 text-primary" />
              Agent Performance Analytics
            </h1>
            <p className="mt-1 text-muted-foreground">
              Insights into your custom AI agents' performance and usage
              patterns
            </p>
          </div>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Bot className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalActiveAgents}</p>
              <p className="text-sm text-muted-foreground">Active Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <MessageSquare className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{totalAgentInteractions}</p>
              <p className="text-sm text-muted-foreground">
                Total Interactions
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <TrendingUp className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{avgInteractionsPerAgent}</p>
              <p className="text-sm text-muted-foreground">Avg per Agent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Zap className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{agents?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Agents</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performing Agents */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Agents</CardTitle>
            <CardDescription>
              Most active custom agents by usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAgents.length > 0 ? (
                topAgents.map((agent, index) => (
                  <div key={agent.id} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="text-2xl">{agent.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {agent.usage_count} interactions
                      </p>
                    </div>
                    <Badge variant="outline">{agent.category}</Badge>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No agent usage data yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Start using your custom agents to see analytics here
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Usage breakdown by agent category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.length > 0 ? (
                categoryData.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-muted-foreground">
                        {item.usage} ({item.percentage}%)
                      </span>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No category data available
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Agent Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Details</CardTitle>
          <CardDescription>
            Comprehensive performance metrics for all your custom agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Interactions</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Cost Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents?.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{agent.icon}</span>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="max-w-48 truncate text-sm text-muted-foreground">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{agent.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.is_active ? "default" : "secondary"}>
                      {agent.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{agent.usage_count}</div>
                  </TableCell>
                  <TableCell>
                    {agent.last_used_at ? (
                      <div className="text-sm">
                        {new Date(agent.last_used_at).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {agent.provider}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        agent.cost_tier === "free"
                          ? "secondary"
                          : agent.cost_tier === "low"
                            ? "outline"
                            : agent.cost_tier === "medium"
                              ? "default"
                              : "destructive"
                      }
                    >
                      {agent.cost_tier}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!agents || agents.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center">
                    <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No custom agents created yet
                    </p>
                    <Button asChild className="mt-4">
                      <Link href="/ai-agents/custom">
                        Create Your First Agent
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
