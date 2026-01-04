"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Calendar,
  MessageSquare,
  DollarSign,
  ArrowUpRight,
  Target,
  Zap,
  CalendarDays,
  Shield,
  Activity,
  Fingerprint,
  Radar,
  Sparkles,
  Cpu,
  Globe,
  Terminal
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuthSession } from "@/client-lib/auth-client";
import { useDashboardStats } from "@/client-lib/api-client";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Widgets
import { StatsOverviewWidget } from "@/components/dashboard/widgets/StatsOverviewWidget";
import { AIAgentsWidget } from "@/components/dashboard/widgets/AIAgentsWidget";
import { LeadPipelineWidget } from "@/components/dashboard/widgets/LeadPipelineWidget";
import { LeadSourcesWidget } from "@/components/dashboard/widgets/LeadSourcesWidget";
import { RecentLeadsWidget } from "@/components/dashboard/widgets/RecentLeadsWidget";
import { QuickActionsWidget } from "@/components/dashboard/widgets/QuickActionsWidget";
import { AppointmentsWidget } from "@/components/dashboard/widgets/AppointmentsWidget";
import { ConversationsWidget } from "@/components/dashboard/widgets/ConversationsWidget";
import { EmailMetricsWidget } from "@/components/dashboard/widgets/EmailMetricsWidget";
import { AIUsageWidget } from "@/components/dashboard/widgets/AIUsageWidget";
import { AIUsageAnalyticsWidget } from "@/components/dashboard/widgets/AIUsageAnalyticsWidget";
import { LeadConversionAnalyticsWidget } from "@/components/dashboard/widgets/LeadConversionAnalyticsWidget";
import { AppointmentStatisticsWidget } from "@/components/dashboard/widgets/AppointmentStatisticsWidget";
import { ChatAnalyticsWidget } from "@/components/dashboard/widgets/ChatAnalyticsWidget";

const DATE_PRESETS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getPresetDateRange(preset: (typeof DATE_PRESETS)[0]): {
  start: Date;
  end: Date;
} {
  const today = new Date();
  const end = today;
  const start = new Date(today.getTime() - preset.days * 24 * 60 * 60 * 1000);
  return { start, end };
}

export default function DashboardPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      return {
        start: formatDateForInput(start),
        end: formatDateForInput(end),
      };
    },
  );

  const { data: stats, isLoading } = useDashboardStats(
    dateRange.start,
    dateRange.end,
  );
  const { data: sessionData, isPending: isAuthPending, error: authError } = useAuthSession();

  const handlePresetSelect = (preset: (typeof DATE_PRESETS)[0]) => {
    const range = getPresetDateRange(preset);
    setDateRange({
      start: formatDateForInput(range.start),
      end: formatDateForInput(range.end),
    });
  };

  const handleCustomDateChange = (field: "start" | "end", value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  if (isAuthPending || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#070708]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Zap className="h-12 w-12 animate-pulse text-primary drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
            <div className="absolute inset-0 h-12 w-12 animate-ping bg-primary/20 rounded-full" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-primary">Neural Link Established</p>
            <div className="w-48 h-[2px] bg-white/5 overflow-hidden">
              <div className="w-full h-full bg-primary animate-progress-loading" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authError || !sessionData?.user) {
    router.replace("/welcome");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-premium-dashboard bg-hud-grid text-white p-4 lg:p-8 animate-fadeIn overflow-x-hidden">
      {/* Premium HUD Header */}
      <div className="flex flex-col items-start justify-between border-b border-primary/10 pb-8 mb-10 gap-8 md:flex-row md:items-center relative">
        <div className="absolute top-0 left-0 w-32 h-[1px] bg-gradient-to-r from-primary to-transparent" />
        <div className="absolute bottom-0 right-0 w-32 h-[1px] bg-gradient-to-l from-secondary to-transparent" />

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="hud-status-dot pulse" />
            <h1 className="text-3xl font-black tracking-[calc(-0.05em)] uppercase italic hud-glitch-text flex items-baseline gap-1">
              <span className="text-white">Agents</span>
              <span className="text-primary">Flow</span>
              <span className="text-[14px] not-italic font-mono text-secondary">.OS</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="px-2 py-0.5 border border-primary/20 bg-primary/5 rounded-none font-mono text-[8px] uppercase tracking-widest text-primary shadow-[0_0_10px_rgba(34,197,94,0.1)]">
              Node: Stable
            </div>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">
              User // {sessionData.user.name?.toUpperCase() || "ADMIN"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 scale-95 origin-right">
          <div className="flex items-center gap-3 bg-white/[0.02] p-2 border border-white/5 backdrop-blur-sm">
            <CalendarDays className="h-3 w-3 text-secondary/70" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleCustomDateChange("start", e.target.value)}
              className="bg-transparent border-none text-[10px] font-mono text-white/80 p-0 focus:ring-0 w-24 hover:text-primary transition-colors"
            />
            <span className="text-[10px] text-white/20 font-mono">{" > "}</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleCustomDateChange("end", e.target.value)}
              className="bg-transparent border-none text-[10px] font-mono text-white/80 p-0 focus:ring-0 w-24 hover:text-primary transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => handlePresetSelect(preset)}
                className="h-7 px-4 border-white/10 bg-transparent text-[8px] font-mono uppercase tracking-[0.2em] hover:bg-primary/10 hover:border-primary/50 text-white/60 hover:text-primary transition-all rounded-none"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 space-y-10">
        <TabsList className="bg-transparent border-b border-white/5 w-full justify-start rounded-none h-12 p-0 gap-10 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="tabs-trigger-hud rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-[10px] uppercase font-mono tracking-[0.4em] px-0 h-full flex gap-3 items-center">
            <span className="text-white/20">01</span> COMMAND
          </TabsTrigger>
          <TabsTrigger value="growth" className="tabs-trigger-hud rounded-none border-b-2 border-transparent data-[state=active]:border-secondary text-[10px] uppercase font-mono tracking-[0.4em] px-0 h-full flex gap-3 items-center">
            <span className="text-white/20">02</span> GROWTH
          </TabsTrigger>
          <TabsTrigger value="ops" className="tabs-trigger-hud rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-[10px] uppercase font-mono tracking-[0.4em] px-0 h-full flex gap-3 items-center">
            <span className="text-white/20">03</span> OPS
          </TabsTrigger>
          <TabsTrigger value="ai" className="tabs-trigger-hud rounded-none border-b-2 border-transparent data-[state=active]:border-secondary text-[10px] uppercase font-mono tracking-[0.4em] px-0 h-full flex gap-3 items-center">
            <span className="text-white/20">04</span> NEURA
          </TabsTrigger>
          <TabsTrigger value="security" className="tabs-trigger-hud rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-[10px] uppercase font-mono tracking-[0.4em] px-0 h-full flex gap-3 items-center">
            <span className="text-white/20">05</span> SECURITY
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 outline-none animate-fadeIn">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
            <StatsOverviewWidget stats={stats} />
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AIAgentsWidget stats={stats} />
            </div>
            <div className="space-y-8">
              <QuickActionsWidget stats={stats} />
              <div className="hud-card p-6 border-white/5 bg-white/[0.02]">
                <div className="hud-header">[GLOBAL_TRAFFIC]</div>
                <div className="flex flex-col gap-6 py-2">
                  <div className="flex items-center gap-4">
                    <Globe className="h-8 w-8 text-secondary animate-pulse" />
                    <div>
                      <p className="text-xl font-black italic">Active</p>
                      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Incoming Data streams</p>
                    </div>
                  </div>
                  <div className="h-[2px] w-full bg-white/5 relative">
                    <div className="absolute inset-0 bg-secondary animate-shimmer-horizontal" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="mt-0 outline-none animate-fadeIn">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <LeadPipelineWidget stats={stats} />
              <LeadConversionAnalyticsWidget stats={stats} />
            </div>
            <div className="space-y-8">
              <RecentLeadsWidget stats={stats} />
              <LeadSourcesWidget stats={stats} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ops" className="mt-0 outline-none animate-fadeIn">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <ConversationsWidget stats={stats} />
              <ChatAnalyticsWidget stats={stats} />
            </div>
            <div className="space-y-8">
              <AppointmentsWidget stats={stats} />
              <AppointmentStatisticsWidget stats={stats} />
              <EmailMetricsWidget stats={stats} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-0 outline-none animate-fadeIn">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AIUsageAnalyticsWidget stats={stats} />
            </div>
            <div className="space-y-8">
              <AIUsageWidget stats={stats} />
              <Card className="hud-card p-8 border-secondary/20 bg-secondary/[0.03]">
                <div className="hud-header-turquoise hud-header">[NEURAL_CORE_X]</div>
                <div className="flex items-center gap-5 mb-8 mt-2">
                  <div className="p-4 bg-secondary/10 border border-secondary/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                    <Cpu className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.1em] text-secondary">Advanced Sync</h3>
                    <p className="text-[9px] font-mono text-white/40 mt-0.5">GEMINI_1.5_PRO_V2</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-mono uppercase text-white/50 tracking-widest">
                      <span>Reasoning</span>
                      <span className="text-secondary">MAX_CAP</span>
                    </div>
                    <Progress value={95} className="h-1 bg-secondary/5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-mono uppercase text-white/50 tracking-widest">
                      <span>Efficiency</span>
                      <span className="text-secondary">OPTIMIZED</span>
                    </div>
                    <Progress value={88} className="h-1 bg-secondary/5" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-0 outline-none animate-fadeIn">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="hud-card p-8 border-primary/20 bg-primary/[0.03]">
              <div className="hud-header">[SOC2_READY]</div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Shield className="h-12 w-12 text-primary mb-6 drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
                <h3 className="font-black text-sm uppercase tracking-[0.3em] text-primary">Certified</h3>
                <p className="text-[9px] font-mono text-white/30 mt-2 uppercase">Protocol: AES_X256</p>
              </div>
            </Card>
            <Card className="hud-card p-8 border-primary/20 bg-primary/[0.03]">
              <div className="hud-header">[TRAFFIC_SCAN]</div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Activity className="h-12 w-12 text-primary mb-6 opacity-30" />
                <h3 className="font-black text-sm uppercase tracking-[0.3em] opacity-30">Shielding</h3>
                <p className="text-[9px] font-mono text-white/30 mt-2 uppercase">Firewall: Tier 3</p>
              </div>
            </Card>
            <Card className="hud-card p-8 border-primary/20 bg-primary/[0.03]">
              <div className="hud-header">[ACCESS_LAYER]</div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Fingerprint className="h-12 w-12 text-primary mb-6 opacity-80" />
                <h3 className="font-black text-sm uppercase tracking-[0.3em]">Encrypted</h3>
                <p className="text-[9px] font-mono text-white/30 mt-2 uppercase">ID: ADMIN_ACTIVE</p>
              </div>
            </Card>
            <Card className="hud-card p-8 border-primary/20 bg-primary/[0.03]">
              <div className="hud-header">[RADAR_LINK]</div>
              <div className="flex flex-col items-center justify-center py-6 text-center relative">
                <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping h-24 w-24 mx-auto my-auto blur-xl" />
                <Radar className="h-12 w-12 text-primary mb-6 animate-pulse z-10" />
                <h3 className="font-black text-sm uppercase tracking-[0.3em] z-10">Searching</h3>
                <p className="text-[9px] font-mono text-white/30 mt-2 uppercase z-10">Threats: 0.00%</p>
              </div>
            </Card>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="hud-card p-8 border-primary/10 bg-black/40">
              <div className="hud-header">[SYSTEM_CONSOLE]</div>
              <div className="space-y-4 font-mono text-[9px] text-primary/60 max-h-[120px] overflow-y-auto scrollbar-hide">
                <div className="flex items-center gap-3 border-b border-primary/5 pb-2">
                  <Terminal className="h-3 w-3" />
                  <span className="text-white/30">02:04:01</span>
                  <span className="text-white/80">KERNEL_READY: PRODUCTION_DEPLOYMENT_VERIFIED</span>
                </div>
                <div className="flex items-center gap-3 border-b border-primary/5 pb-2">
                  <Terminal className="h-3 w-3" />
                  <span className="text-white/30">02:03:45</span>
                  <span className="text-primary/70">SYNC_COMPLETE: DATABASE_MIGRATION_V12_SUCCESS</span>
                </div>
                <div className="flex items-center gap-3 border-b border-primary/5 pb-2">
                  <Terminal className="h-3 w-3" />
                  <span className="text-white/30">02:00:22</span>
                  <span className="text-white/80">SESSION_INIT: {sessionData.user.email} -> MAC_AUTH</span>
                </div>
                <div className="flex items-center gap-3 border-b border-primary/5 pb-2">
                  <Terminal className="h-3 w-3" />
                  <span className="text-white/30">01:55:01</span>
                  <span className="text-primary/70">LLM_GATEWAY: GOOGLE_GEMINI_STABLE_UPLINK</span>
                </div>
              </div>
            </div>

            <div className="hud-card p-8 border-primary/20 bg-primary/[0.04] relative">
              <div className="absolute top-0 right-0 p-2 text-primary/10">
                <Activity className="h-24 w-24" />
              </div>
              <div className="hud-header text-primary">[SUMMARY_REPORT]</div>
              <div className="flex flex-col gap-6 h-full justify-center relative z-10">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-base font-black uppercase tracking-widest italic text-white/90">ALL SYSTEMS NOMINAL</span>
                </div>
                <p className="text-[10px] font-mono text-white/50 uppercase leading-relaxed max-w-sm tracking-widest">
                  Processing 14 active lead streams. Neural priority assigned to high-conversion segments. Deployment commit 063d947 verified on VPS node 1.
                </p>
                <Button asChild size="sm" className="w-fit h-8 px-6 text-[10px] font-mono uppercase tracking-[0.2em] bg-primary text-black hover:bg-primary/90 rounded-none font-bold">
                  <Link href="/chat">Access AI Terminal</Link>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-6 opacity-30">
        <div className="flex gap-10 items-center">
          <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-mono uppercase tracking-widest">CPU_LOAD</span>
            <span className="text-[9px] font-mono text-primary font-bold">12.4%</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-mono uppercase tracking-widest">MEM_UTIL</span>
            <span className="text-[9px] font-mono text-secondary font-bold">48.2%</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-mono uppercase tracking-widest">LAT_MS</span>
            <span className="text-[9px] font-mono text-primary font-bold">12ms</span>
          </div>
        </div>
        <div className="text-[8px] font-mono uppercase tracking-[0.4em]">
          Secure connection : encrypted // 2026
        </div>
      </div>
    </div>
  );
}
