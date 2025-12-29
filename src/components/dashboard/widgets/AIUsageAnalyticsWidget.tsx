"use client";

import { useComprehensiveAnalytics } from "@/client-lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Zap, Clock, DollarSign } from "lucide-react";

interface AIUsageAnalyticsWidgetProps {
  stats?: any; // Keep for backward compatibility
}

export function AIUsageAnalyticsWidget({ stats }: AIUsageAnalyticsWidgetProps) {
  const { data: analytics, isLoading, error } = useComprehensiveAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted"></div>
          <div className="h-4 w-1/2 rounded bg-muted"></div>
          <div className="h-4 w-2/3 rounded bg-muted"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics?.aiMetrics) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No AI usage data available
        </p>
      </div>
    );
  }

  const { aiMetrics } = analytics;
  const successRate =
    aiMetrics.totalRequests > 0
      ? Math.round(
          (aiMetrics.successfulRequests / aiMetrics.totalRequests) * 100,
        )
      : 0;

  return (
    <div className="space-y-4">
      {/* AI Usage Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Bot className="h-3 w-3" />
            Total Requests
          </div>
          <div className="text-lg font-bold">
            {aiMetrics.totalRequests.toLocaleString()}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            Success Rate
          </div>
          <div className="text-lg font-bold text-green-600">{successRate}%</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Avg Response Time
          </span>
          <span className="font-medium">{aiMetrics.avgResponseTime}ms</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Cost Analysis
          </span>
          <span className="font-medium">
            {aiMetrics.costAnalysis.length > 0
              ? `$${aiMetrics.costAnalysis.reduce((sum, cost) => sum + cost.cost, 0).toFixed(2)}`
              : "N/A"}
          </span>
        </div>
      </div>

      {/* Model Usage */}
      {aiMetrics.modelUsage.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Top Models</h4>
          <div className="space-y-2">
            {aiMetrics.modelUsage.slice(0, 3).map((model, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium">{model.model}</span>
                  <span className="text-muted-foreground">
                    {model.requests} requests
                  </span>
                </div>
                <Progress
                  value={(model.requests / aiMetrics.totalRequests) * 100}
                  className="h-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider Breakdown */}
      {aiMetrics.costAnalysis.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Providers</h4>
          <div className="space-y-1">
            {aiMetrics.costAnalysis.map((provider, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs"
              >
                <Badge variant="outline" className="text-xs">
                  {provider.provider}
                </Badge>
                <span className="text-muted-foreground">
                  {provider.requests} requests
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
