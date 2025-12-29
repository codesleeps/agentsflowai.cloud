"use client";

import { Badge } from "@/components/ui/badge";

interface LeadSourcesWidgetProps {
  stats: any;
}

const sourceIcons: Record<string, string> = {
  website: "🌐",
  chat: "💬",
  referral: "🤝",
  ads: "📢",
};

export function LeadSourcesWidget({ stats }: LeadSourcesWidgetProps) {
  return (
    <div className="space-y-3">
      {stats?.leadsBySource?.map((item: any) => (
        <div
          key={item.source}
          className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{sourceIcons[item.source] || "📊"}</span>
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
    </div>
  );
}
