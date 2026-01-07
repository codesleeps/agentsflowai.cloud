"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { subDays, format } from "date-fns";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Activity,
} from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

interface ProviderHealth {
  provider: string;
  uptime: number;
  avgLatency: number;
  errorRate: number;
  costPerDay: number;
  totalRequests: number;
  successCount: number;
  failedCount: number;
}

interface AlertItem {
  id: string;
  type: string;
  provider: string;
  severity: string;
  message: string;
  threshold: string;
  currentValue: number;
  triggered_at: string;
  acknowledged: boolean;
}

interface ModelPerformance {
  provider: string;
  model: string;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  avgCostPerRequest: number;
  totalCost: number;
  totalTokens: number;
}

interface FallbackItem {
  id: string;
  agent_id: string;
  original_provider: string;
  original_model: string;
  fallback_provider: string;
  fallback_model: string;
  reason: string;
  count: number;
  last_occurrence: string;
  avg_latency_increase: number;
}

interface CostProjection {
  currentDailyAvg: number;
  projectedWeekly: number;
  projectedMonthly: number;
  projectedYearly: number;
  trend: string;
  percentChange: number;
}

interface TimeSeriesData {
  date: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  avgLatency: number;
}

const fetchData = async (metricType: string, dateRange: { from: Date; to: Date }, provider?: string) => {
  const params = new URLSearchParams({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
    metricType,
  });
  if (provider) params.append('provider', provider);
  
  const res = await fetch(`/api/ai/usage?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch ${metricType} data`);
  return res.json();
};

export default function UsageAnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedProvider, setSelectedProvider] = useState<string>("");

  // Queries for different metrics
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["aiUsage", "summary", dateRange],
    queryFn: () => fetchData("summary", dateRange),
  });

  const { data: providerHealth, isLoading: healthLoading } = useQuery({
    queryKey: ["aiUsage", "provider-health", dateRange],
    queryFn: () => fetchData("provider-health", dateRange),
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ["aiUsage", "time-series", dateRange, selectedProvider],
    queryFn: () => fetchData("time-series", dateRange, selectedProvider),
  });

  const { data: modelPerformance, isLoading: modelLoading } = useQuery({
    queryKey: ["aiUsage", "model-performance", dateRange],
    queryFn: () => fetchData("model-performance", dateRange),
  });

  const { data: fallbackData, isLoading: fallbackLoading } = useQuery({
    queryKey: ["aiUsage", "fallback-tracking", dateRange],
    queryFn: () => fetchData("fallback-tracking", dateRange),
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["aiUsage", "alerts", dateRange],
    queryFn: () => fetchData("alerts", dateRange),
    refetchInterval: 30000, // Refetch alerts every 30 seconds
  });

  const { data: costProjection, isLoading: projectionLoading } = useQuery({
    queryKey: ["aiUsage", "cost-projection", dateRange],
    queryFn: () => fetchData("cost-projection", dateRange),
  });

  // Calculate summary totals
  const totalTokens = summaryData?.reduce(
    (acc: number, item: any) => acc + (item._sum.total_tokens || 0),
    0
  ) || 0;
  const totalCost = summaryData?.reduce(
    (acc: number, item: any) => acc + (item._sum.cost_usd || 0),
    0
  ) || 0;
  const totalRequests = summaryData?.reduce(
    (acc: number, item: any) => acc + item._count._all,
    0
  ) || 0;

  const exportToCSV = useCallback(() => {
    const data = {
      summary: summaryData,
      providerHealth,
      modelPerformance,
      fallbackData,
      costProjection,
    };
    
    const csvContent = JSON.stringify(data, null, 2);
    const blob = new Blob([csvContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-usage-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [summaryData, providerHealth, modelPerformance, fallbackData, costProjection]);

  const exportToJSON = useCallback(() => {
    const data = {
      generatedAt: new Date().toISOString(),
      dateRange: { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
      summary: summaryData,
      providerHealth,
      modelPerformance,
      fallbackData,
      alerts,
      costProjection,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-usage-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dateRange, summaryData, providerHealth, modelPerformance, fallbackData, alerts, costProjection]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Usage Analytics</h1>
          <p className="text-muted-foreground mt-1">Monitor your AI provider performance and usage</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onValueChange={(val: any) => val && setDateRange(val)} />
          <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={exportToJSON}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-2xl">{totalRequests.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tokens</CardDescription>
            <CardTitle className="text-2xl">{totalTokens.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cost</CardDescription>
            <CardTitle className="text-2xl">${totalCost.toFixed(4)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Providers</CardDescription>
            <CardTitle className="text-2xl">{providerHealth?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Provider Health Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Health Overview</CardTitle>
          <CardDescription>Real-time status of your AI providers</CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(providerHealth as ProviderHealth[])?.map((provider: ProviderHealth) => (
                <Card key={provider.provider} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold capitalize">{provider.provider}</h3>
                      <Badge variant={provider.errorRate > 5 ? "destructive" : "default"}>
                        {provider.totalRequests} requests
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Uptime</span>
                        <span className={provider.uptime >= 99 ? "text-green-500" : provider.uptime >= 95 ? "text-yellow-500" : "text-red-500"}>
                          {provider.uptime.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={provider.uptime} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Latency</span>
                        <span>{provider.avgLatency.toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Error Rate</span>
                        <span className={provider.errorRate > 5 ? "text-red-500" : "text-green-500"}>
                          {provider.errorRate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cost/Day</span>
                        <span>${provider.costPerDay.toFixed(4)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Active Alerts
              </CardTitle>
              <CardDescription>Monitored issues requiring attention</CardDescription>
            </div>
            <Badge variant="outline">{alerts?.length || 0} active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : alerts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No active alerts. Everything looks good!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(alerts as AlertItem[])?.map((alert: AlertItem) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 mt-2 rounded-full ${getSeverityColor(alert.severity)}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{alert.provider}</span>
                      <Badge variant="outline" className="text-xs">{alert.severity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Threshold: {alert.threshold}</span>
                      <span>Current: {alert.currentValue.toFixed(2)}</span>
                      <span>Type: {alert.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Over Time</CardTitle>
            <CardDescription>Token usage and cost trends</CardDescription>
          </CardHeader>
          <CardContent>
            {timeSeriesLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeries as TimeSeriesData[]}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="totalTokens" stroke="#8884d8" fillOpacity={1} fill="url(#colorTokens)" name="Tokens" />
                  <Line type="monotone" dataKey="totalCost" stroke="#82ca9d" name="Cost ($)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Model Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Model Performance Comparison</CardTitle>
            <CardDescription>Success rate and latency by model</CardDescription>
          </CardHeader>
          <CardContent>
            {modelLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={modelPerformance as ModelPerformance[]} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="model" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="successRate" fill="#82ca9d" name="Success Rate (%)" />
                  <Bar dataKey="avgLatency" fill="#8884d8" name="Latency (ms)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Projection and Fallback Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Projection Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Cost Projection
            </CardTitle>
            <CardDescription>Estimated costs based on current usage</CardDescription>
          </CardHeader>
          <CardContent>
            {projectionLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : costProjection ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Daily Average</span>
                  <span className="font-semibold">${(costProjection as CostProjection).currentDailyAvg.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Weekly Projection</span>
                  <span className="font-semibold">${(costProjection as CostProjection).projectedWeekly.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Monthly Projection</span>
                  <span className="font-semibold">${(costProjection as CostProjection).projectedMonthly.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Yearly Projection</span>
                  <span className="font-semibold">${(costProjection as CostProjection).projectedYearly.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Trend</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon((costProjection as CostProjection).trend)}
                    <span className="capitalize">{(costProjection as CostProjection).trend}</span>
                    <Badge variant="outline">
                      {(costProjection as CostProjection).percentChange > 0 ? '+' : ''}
                      {(costProjection as CostProjection).percentChange.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No projection data available</div>
            )}
          </CardContent>
        </Card>

        {/* Fallback Tracking Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              Fallback Tracking
            </CardTitle>
            <CardDescription>Recent fallback activations and reasons</CardDescription>
          </CardHeader>
          <CardContent>
            {fallbackLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : fallbackData?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No fallback activations recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Agent</th>
                      <th className="text-left py-2 px-3">From</th>
                      <th className="text-left py-2 px-3">To</th>
                      <th className="text-left py-2 px-3">Reason</th>
                      <th className="text-right py-2 px-3">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fallbackData as FallbackItem[])?.slice(0, 10).map((fallback: FallbackItem) => (
                      <tr key={fallback.id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{fallback.agent_id}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-xs">
                            {fallback.original_provider}/{fallback.original_model}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="secondary" className="text-xs">
                            {fallback.fallback_provider}/{fallback.fallback_model}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground truncate max-w-[150px]">
                          {fallback.reason || 'Unknown'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Badge variant="destructive" className="text-xs">
                            {fallback.count}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
