"use client";

import { Progress } from "@/components/ui/progress";

interface LeadPipelineWidgetProps {
  stats: any;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  qualified: "bg-green-500",
  proposal: "bg-purple-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

export function LeadPipelineWidget({ stats }: LeadPipelineWidgetProps) {
  return (
    <div className="space-y-4">
      {stats?.leadsByStatus?.map((item: any) => (
        <div key={item.status} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium capitalize">
              {item.status}
            </span>
            <span className="text-sm text-muted-foreground">{item.count}</span>
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
    </div>
  );
}
