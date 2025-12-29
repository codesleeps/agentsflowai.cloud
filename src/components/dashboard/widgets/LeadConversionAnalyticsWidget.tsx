"use client";

import { useComprehensiveAnalytics } from "@/client-lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, Target, Award } from "lucide-react";

interface LeadConversionAnalyticsWidgetProps {
  stats?: any; // Keep for backward compatibility
}

export function LeadConversionAnalyticsWidget({
  stats,
}: LeadConversionAnalyticsWidgetProps) {
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

  if (error || !analytics?.leadTrends) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No lead conversion data available
        </p>
      </div>
    );
  }

  const { monthly, statusDistribution, sourceAnalysis } = analytics.leadTrends;

  // Calculate conversion metrics
  const totalLeads = statusDistribution.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const qualifiedLeads = statusDistribution
    .filter((item) => ["qualified", "proposal", "won"].includes(item.status))
    .reduce((sum, item) => sum + item.count, 0);
  const wonLeads =
    statusDistribution.find((item) => item.status === "won")?.count || 0;

  const qualificationRate =
    totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
  const conversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Recent trend (last 3 months)
  const recentMonths = monthly.slice(-3);
  const trendDirection =
    recentMonths.length >= 2
      ? recentMonths[recentMonths.length - 1].leads >
        recentMonths[recentMonths.length - 2].leads
        ? "up"
        : "down"
      : "neutral";

  return (
    <div className="space-y-4">
      {/* Conversion Funnel Overview */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            Total
          </div>
          <div className="text-lg font-bold">{totalLeads}</div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Target className="h-3 w-3" />
            Qualified
          </div>
          <div className="text-lg font-bold text-blue-600">
            {qualifiedLeads}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Award className="h-3 w-3" />
            Won
          </div>
          <div className="text-lg font-bold text-green-600">{wonLeads}</div>
        </div>
      </div>

      {/* Conversion Rates */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Qualification Rate</span>
          <div className="flex items-center gap-1">
            <span className="font-medium">{qualificationRate}%</span>
            {trendDirection === "up" && (
              <TrendingUp className="h-3 w-3 text-green-500" />
            )}
            {trendDirection === "down" && (
              <TrendingUp className="h-3 w-3 rotate-180 text-red-500" />
            )}
          </div>
        </div>
        <Progress value={qualificationRate} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Conversion Rate</span>
          <span className="font-medium">{conversionRate}%</span>
        </div>
        <Progress value={conversionRate} className="h-2" />
      </div>

      {/* Source Performance */}
      {sourceAnalysis.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Source Performance</h4>
          <div className="space-y-2">
            {sourceAnalysis.slice(0, 4).map((source, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium capitalize">
                    {source.source}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {source.count} leads
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        source.conversionRate >= 20
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : source.conversionRate >= 10
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {source.conversionRate}%
                    </Badge>
                  </div>
                </div>
                <Progress
                  value={(source.count / totalLeads) * 100}
                  className="h-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      {recentMonths.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Trend</h4>
          <div className="flex h-12 items-end gap-1">
            {recentMonths.map((month, index) => (
              <div
                key={index}
                className="flex-1 rounded-t bg-primary/20"
                style={{
                  height: `${Math.max((month.leads / Math.max(...recentMonths.map((m) => m.leads))) * 100, 10)}%`,
                }}
                title={`${month.month}: ${month.leads} leads`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {recentMonths.map((month, index) => (
              <span key={index}>{month.month}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
