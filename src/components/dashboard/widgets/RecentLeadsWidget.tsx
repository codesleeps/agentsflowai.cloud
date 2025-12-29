"use client";

import { Badge } from "@/components/ui/badge";

interface RecentLeadsWidgetProps {
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

export function RecentLeadsWidget({ stats }: RecentLeadsWidgetProps) {
  return (
    <div className="space-y-3">
      {stats?.recentLeads?.map((lead: any) => (
        <div
          key={lead.id}
          className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-semibold text-primary">
                {lead.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{lead.name}</p>
              <p className="text-xs text-muted-foreground">{lead.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right md:block">
              <p className="text-xs font-medium">
                {lead.company || "No company"}
              </p>
              <p className="text-xs text-muted-foreground">
                Score: {lead.score}/100
              </p>
            </div>
            <Badge
              variant="secondary"
              className={`${statusColors[lead.status]}/20 text-xs capitalize`}
            >
              {lead.status}
            </Badge>
          </div>
        </div>
      ))}
      {(!stats?.recentLeads || stats.recentLeads.length === 0) && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No leads yet. Start by creating one or using the AI Chat Agent.
        </p>
      )}
    </div>
  );
}
