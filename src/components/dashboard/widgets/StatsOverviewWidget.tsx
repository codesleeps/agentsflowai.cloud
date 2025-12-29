"use client";

import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsOverviewWidgetProps {
  stats: any;
}

export function StatsOverviewWidget({ stats }: StatsOverviewWidgetProps) {
  const growthPercentage = stats?.periodComparison?.growthPercentage || 0;

  return (
    <div className="space-y-4">
      {/* Main Stats Cards */}
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Leads</span>
          <span className="text-2xl font-bold">{stats?.totalLeads ?? 0}</span>
        </div>
        {stats?.periodComparison && (
          <div className="flex items-center gap-1 text-xs">
            <ArrowUpRight
              className={`h-3 w-3 ${
                growthPercentage >= 0 ? "text-green-500" : "text-red-500"
              }`}
            />
            <span
              className={
                growthPercentage >= 0 ? "text-green-500" : "text-red-500"
              }
            >
              {growthPercentage >= 0 ? "+" : ""}
              {growthPercentage}%
            </span>
            <span className="text-muted-foreground">vs previous period</span>
          </div>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Qualified Leads</span>
          <span className="text-2xl font-bold">
            {stats?.qualifiedLeads ?? 0}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {stats?.conversionRate ?? 0}% conversion rate
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Revenue</span>
          <span className="text-2xl font-bold">
            ${(stats?.revenue ?? 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Active Conversations</span>
          <span className="text-2xl font-bold">
            {stats?.activeConversations ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}
