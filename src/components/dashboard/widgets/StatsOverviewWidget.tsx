"use client";

import { ArrowUpRight, TrendingUp, Target, DollarSign, MessageSquare } from "lucide-react";

interface StatsOverviewWidgetProps {
  stats: any;
}

export function StatsOverviewWidget({ stats }: StatsOverviewWidgetProps) {
  const growthPercentage = stats?.periodComparison?.growthPercentage || 0;

  const items = [
    {
      label: "Total Leads",
      value: stats?.totalLeads ?? 0,
      icon: TrendingUp,
      trend: growthPercentage,
      trendLabel: "vs prev",
    },
    {
      label: "Qualified",
      value: stats?.qualifiedLeads ?? 0,
      icon: Target,
      subValue: `${stats?.conversionRate ?? 0}% rate`,
    },
    {
      label: "Revenue",
      value: `$${(stats?.revenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      trend: 23, // Placeholder growth for revenue if not in stats
    },
    {
      label: "Active AI",
      value: stats?.activeConversations ?? 0,
      icon: MessageSquare,
      subValue: "Current Sessions",
    },
  ];

  return (
    <>
      {items.map((item) => (
        <div key={item.label} className="hud-card p-4 border-primary/20 bg-primary/5 transition-all hover:bg-primary/10">
          <div className="hud-header">[DATA_NODE]</div>
          <div className="flex items-center justify-between">
            <div className="p-1.5 bg-primary/10 rounded border border-primary/20">
              <item.icon className="h-3 w-3 text-primary" />
            </div>
            {item.trend !== undefined && (
              <div className="flex items-center gap-1">
                <ArrowUpRight className={`h-3 w-3 ${item.trend >= 0 ? "text-green-500" : "text-red-500"}`} />
                <span className={`text-[10px] font-mono ${item.trend >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {item.trend >= 0 ? "+" : ""}{item.trend}%
                </span>
              </div>
            )}
          </div>
          <div className="mt-3">
            <div className="text-xl font-black tracking-tighter text-white">{item.value}</div>
            <div className="flex justify-between items-center mt-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-primary/60">{item.label}</div>
              {item.subValue && <div className="text-[9px] font-mono text-white/40 italic">{item.subValue}</div>}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
