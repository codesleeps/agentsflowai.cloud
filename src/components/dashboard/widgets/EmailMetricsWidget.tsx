"use client";

interface EmailMetricsWidgetProps {
  stats: any;
}

export function EmailMetricsWidget({ stats }: EmailMetricsWidgetProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Email Open Rate</span>
        <span className="text-2xl font-bold">
          {stats?.emailMetrics?.openRate ?? 0}%
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {(stats?.emailMetrics?.totalOpened ?? 0).toLocaleString()} opened
      </p>
    </div>
  );
}
