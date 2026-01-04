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
      color: "text-primary",
      bgBorder: "border-primary/20",
      bgFill: "bg-primary/5"
    },
    {
      label: "Qualified",
      value: stats?.qualifiedLeads ?? 0,
      icon: Target,
      subValue: `${stats?.conversionRate ?? 0}% rate`,
      color: "text-secondary",
      bgBorder: "border-secondary/20",
      bgFill: "bg-secondary/5"
    },
    {
      label: "Revenue",
      value: `$${(stats?.revenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      trend: 23,
      color: "text-primary",
      bgBorder: "border-primary/20",
      bgFill: "bg-primary/5"
    },
    {
      label: "Active AI",
      value: stats?.activeConversations ?? 0,
      icon: MessageSquare,
      subValue: "Sessions",
      color: "text-secondary",
      bgBorder: "border-secondary/20",
      bgFill: "bg-secondary/5"
    },
  ];

  return (
    <>
      {items.map((item) => (
        <div key={item.label} className={`hud-card p-5 border-white/[0.03] bg-white/[0.01] transition-all hover:bg-white/[0.03] relative group`}>
          <div className="absolute top-0 left-0 w-8 h-[1px] bg-white/10" />
          <div className="hud-header">[DATA_L-{item.label.substring(0, 3).toUpperCase()}]</div>

          <div className="flex items-center justify-between mb-4 mt-1">
            <div className={`p-2 border ${item.bgBorder} ${item.bgFill} shadow-[0_0_10px_rgba(34,197,94,0.05)]`}>
              <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
            </div>
            {item.trend !== undefined && (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <ArrowUpRight className={`h-3 w-3 ${item.trend >= 0 ? "text-primary" : "text-red-500"}`} />
                  <span className={`text-[11px] font-black italic ${item.trend >= 0 ? "text-primary" : "text-red-500"}`}>
                    {item.trend >= 0 ? "+" : ""}{item.trend}%
                  </span>
                </div>
                <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest mt-0.5">Performance</span>
              </div>
            )}
          </div>

          <div className="mt-2">
            <div className="text-2xl font-black tracking-tighter text-white group-hover:text-primary transition-colors">{item.value}</div>
            <div className="flex justify-between items-center mt-2">
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/50">{item.label}</div>
              {item.subValue && <div className="text-[8px] font-mono text-white/30 italic uppercase tracking-widest">{item.subValue}</div>}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
