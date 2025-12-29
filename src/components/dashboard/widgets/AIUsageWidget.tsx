"use client";

interface AIUsageWidgetProps {
  stats: any;
}

export function AIUsageWidget({ stats }: AIUsageWidgetProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">AI Requests</span>
        <span className="text-2xl font-bold">
          {(
            stats?.aiUsage?.requestsThisPeriod ||
            stats?.aiUsage?.requestsThisMonth ||
            0
          ).toLocaleString()}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {stats?.dateRange ? "This period" : "This month"}
      </p>
    </div>
  );
}
