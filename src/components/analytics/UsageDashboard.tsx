"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  Activity,
  Clock,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Mock data - replace with actual API calls
const mockTimeSeriesData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toISOString().split("T")[0],
    tokens: Math.floor(Math.random() * 50000) + 10000,
    cost: Math.random() * 5 + 0.5,
    requests: Math.floor(Math.random() * 100) + 20,
  };
});

const mockProviderBreakdown = [
  { provider: "openai", tokens: 450000, cost: 12.5, percentage: 55 },
  { provider: "anthropic", tokens: 180000, cost: 8.2, percentage: 35 },
  { provider: "deepseek", tokens: 80000, cost: 1.8, percentage: 10 },
];

const mockModelBreakdown = [
  { model: "gpt-4o", tokens: 300000, cost: 8.5, requests: 450 },
  { model: "claude-3-5-sonnet", tokens: 180000, cost: 8.2, requests: 320 },
  { model: "gpt-4o-mini", tokens: 150000, cost: 0.8, requests: 890 },
  { model: "deepseek-chat", tokens: 80000, cost: 1.8, requests: 210 },
];

export function UsageDashboard() {
  const [timeRange, setTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate totals
  const totalTokens = mockTimeSeriesData.reduce((sum, d) => sum + d.tokens, 0);
  const totalCost = mockTimeSeriesData.reduce((sum, d) => sum + d.cost, 0);
  const totalRequests = mockTimeSeriesData.reduce((sum, d) => sum + d.requests, 0);
  const avgLatency = 850; // ms

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Usage Analytics</h2>
          <p className="text-muted-foreground">
            Track your AI usage, costs, and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Budget Alert */}
      <Alert className="border-yellow-500 bg-yellow-50 text-yellow-900">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-900">Budget Alert</AlertTitle>
        <AlertDescription className="text-yellow-800">
          You&apos;ve used 85% of your monthly budget (${totalCost.toFixed(2)} / $100.00)
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalTokens)}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalRequests)}</div>
            <p className="text-xs text-muted-foreground">
              +23% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLatency}ms</div>
            <p className="text-xs text-muted-foreground">
              -5% from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Over Time</CardTitle>
              <CardDescription>Daily token usage and costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-end justify-between gap-2">
                {mockTimeSeriesData.map((day, i) => {
                  const height = (day.tokens / 60000) * 100;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 bg-primary/20 hover:bg-primary/30 transition-colors rounded-t"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${day.date}: ${formatNumber(day.tokens)} tokens, ${formatCurrency(day.cost)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{mockTimeSeriesData[0].date}</span>
                <span>{mockTimeSeriesData[mockTimeSeriesData.length - 1].date}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Breakdown</CardTitle>
              <CardDescription>Usage and costs by AI provider</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockProviderBreakdown.map((provider) => (
                  <div key={provider.provider} className="flex items-center gap-4">
                    <div className="w-24 font-medium capitalize">{provider.provider}</div>
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${provider.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-32 text-right text-sm">
                      {formatCurrency(provider.cost)}
                    </div>
                    <div className="w-20 text-right text-sm text-muted-foreground">
                      {provider.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Usage</CardTitle>
              <CardDescription>Breakdown by AI model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockModelBreakdown.map((model) => (
                  <div key={model.model} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{model.model}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(model.tokens)} tokens • {model.requests} requests
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(model.cost)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(model.cost / model.requests)}/req
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Usage</CardTitle>
              <CardDescription>Usage breakdown by AI agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Agent usage data will appear here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
