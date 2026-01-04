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
  Sparkles
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

// Date range presets
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
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Zap className="h-10 w-10 animate-pulse text-primary" />
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary/60">System Initializing...</p>
        </div>
      </div>
    );
  }

  if (authError || !sessionData?.user) {
    router.replace("/welcome");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-black/95 bg-hud-grid text-white p-4 lg:p-8 animate-fadeIn">
      {/* HUD Header */}
      <div className="flex flex-col items-start justify-between border-b border-primary/20 pb-6 mb-8 gap-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="hud-status-dot pulse" />
            <h1 className="text-2xl font-black tracking-tighter uppercase italic hud-glitch-text">
              AgentsFlow<span className="text-primary">.AI</span>
            </h1>
          </div>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.4em] text-primary/50">
            Secure Operations Terminal // {sessionData.user.name?.toUpperCase() || "ADMIN"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 scale-90 origin-right">
          <div className="flex items-center gap-2 bg-primary/5 p-1.5 border border-primary/20 rounded-none">
            <CalendarDays className="h-3 w-3 text-primary/60" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleCustomDateChange("start", e.target.value)}
              className="bg-transparent border-none text-[10px] font-mono text-white p-0 focus:ring-0 w-24"
            />
            <span className="text-[10px] text-primary/30 font-mono">{" >> "}</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleCustomDateChange("end", e.target.value)}
              className="bg-transparent border-none text-[10px] font-mono text-white p-0 focus:ring-0 w-24"
            />
          </div>

          <div className="flex gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => handlePresetSelect(preset)}
                className="h-6 px-3 border-primary/20 bg-transparent text-[8px] font-mono uppercase tracking-[0.2em] hover:bg-primary/10 hover:border-primary/50 text-primary/80"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 space-y-8">
        <TabsList className="bg-transparent border-b border-white/5 w-full justify-start rounded-none h-10 p-0 gap-8 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[9px] uppercase font-mono tracking-[0.3em] px-0 h-full transition-all opacity-50 data-[state=active]:opacity-100">01. COMMAND</TabsTrigger>
          <TabsTrigger value="growth" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[9px] uppercase font-mono tracking-[0.3em] px-0 h-full transition-all opacity-50 data-[state=active]:opacity-100">02. GROWTH</TabsTrigger>
          <TabsTrigger value="ops" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[9px] uppercase font-mono tracking-[0.3em] px-0 h-full transition-all opacity-50 data-[state=active]:opacity-100">03. OPERATIONS</TabsTrigger>
          <TabsTrigger value="ai" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[9px] uppercase font-mono tracking-[0.3em] px-0 h-full transition-all opacity-50 data-[state=active]:opacity-100">04. AI_CORE</TabsTrigger>
          <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[9px] uppercase font-mono tracking-[0.3em] px-0 h-full transition-all opacity-50 data-[state=active]:opacity-100">05. SECURITY</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 outline-none animate-fadeIn">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatsOverviewWidget stats={stats} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AIAgentsWidget stats={stats} />
            </div>
            <div>
              <QuickActionsWidget stats={stats} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="mt-0 outline-none animate-fadeIn">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <LeadPipelineWidget stats={stats} />
              <LeadConversionAnalyticsWidget stats={stats} />
            </div>
            <div className="space-y-6">
              <RecentLeadsWidget stats={stats} />
              <LeadSourcesWidget stats={stats} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ops" className="mt-0 outline-none animate-fadeIn">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <ConversationsWidget stats={stats} />
              <ChatAnalyticsWidget stats={stats} />
            </div>
            <div className="space-y-6">
              <AppointmentsWidget stats={stats} />
              <AppointmentStatisticsWidget stats={stats} />
              <EmailMetricsWidget stats={stats} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-0 outline-none animate-fadeIn">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AIUsageAnalyticsWidget stats={stats} />
            </div>
            <div className="space-y-6">
              <AIUsageWidget stats={stats} />
              <Card className="hud-card p-6 border-hud-ai/30">
                <div className="hud-header text-hud-ai">[NEURAL_PROCESSOR]</div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-hud-ai/10 border border-hud-ai/20">
                    <Zap className="h-5 w-5 text-hud-ai" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-hud-ai">AI Matrix Online</h3>
                    <p className="text-[9px] font-mono text-white/40">Syncing with Google Gemini 2.0</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[8px] font-mono uppercase text-white/60">
                      <span>Sync Latency</span>
                      <span>12ms</span>
                    </div>
                    <Progress value={92} className="h-1 bg-hud-ai/5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[8px] font-mono uppercase text-white/60">
                      <span>Reasoning Weight</span>
                      <span>HIGH</span>
                    </div>
                    <Progress value={85} className="h-1 bg-hud-ai/5" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-0 outline-none animate-fadeIn">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="hud-card p-6 border-hud-sec/30">
              <div className="hud-header text-hud-sec">[SOC2_GATE]</div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Shield className="h-12 w-12 text-hud-sec mb-4 opacity-80" />
                <h3 className="font-black text-sm uppercase tracking-[0.2em] text-hud-sec">Verified</h3>
                <p className="text-[8px] font-mono text-white/40 mt-1">PROTO_v4.2</p>
              </div>
            </Card>
            <Card className="hud-card p-6 border-hud-sec/30">
              <div className="hud-header text-hud-sec">[GDPR_SYNC]</div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Activity className="h-12 w-12 text-hud-sec mb-4 opacity-40" />
                <h3 className="font-black text-sm uppercase tracking-[0.2em] opacity-40">Active</h3>
                <p className="text-[8px] font-mono text-white/40 mt-1">DATA_RESIDENCY_EU</p>
              </div>
            </Card>
            <Card className="hud-card p-6 border-hud-sec/30">
              <div className="hud-header text-hud-sec">[BIO_SCAN]</div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Fingerprint className="h-12 w-12 text-hud-sec mb-4" />
                <h3 className="font-black text-sm uppercase tracking-[0.2em]">Secured</h3>
                <p className="text-[8px] font-mono text-white/40 mt-1">THREAT_LEVEL_MIN</p>
              </div>
            </Card>
            <Card className="hud-card p-6 border-hud-sec/30">
              <div className="hud-header text-hud-sec">[RADAR_LINK]</div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Radar className="h-12 w-12 text-hud-sec mb-4 animate-pulse opacity-80" />
                <h3 className="font-black text-sm uppercase tracking-[0.2em]">Scanning</h3>
                <p className="text-[8px] font-mono text-white/40 mt-1">UPLINK_STABLE</p>
              </div>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="hud-card p-6 border-hud-sec/20 bg-black/40">
              <div className="hud-header text-hud-sec">[CONSOLE_LOGS]</div>
              <div className="space-y-3 font-mono text-[8px] text-hud-sec/60">
                <div className="flex justify-between border-b border-hud-sec/10 pb-1.5 hover:text-hud-sec transition-colors cursor-default">
                  <span>2026-01-04 01:40:01</span>
                  <span>ENCRYPTION_LAYER_v2 ACTIVE</span>
                </div>
                <div className="flex justify-between border-b border-hud-sec/10 pb-1.5 hover:text-hud-sec transition-colors cursor-default">
                  <span>2026-01-04 01:38:45</span>
                  <span>HEARTBEAT: PRODUCTION_NODE_ONLINE</span>
                </div>
                <div className="flex justify-between border-b border-hud-sec/10 pb-1.5 hover:text-hud-sec transition-colors cursor-default">
                  <span>2026-01-04 01:35:22</span>
                  <span>CLIENT_SESSION_INIT: {sessionData.user.email}</span>
                </div>
              </div>
            </div>

            <div className="hud-card p-6 border-primary/20 bg-primary/5">
              <div className="hud-header text-primary">[SYSTEM_SUMMARY]</div>
              <div className="flex items-center gap-6 h-full">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest italic">All systems nominal</span>
                  </div>
                  <p className="text-[9px] font-mono text-white/60 uppercase leading-relaxed">
                    Your agents are currently processing 14 historical leads. AI model "Gemini-2.0-Flash" is responding with an average latency of 0.8s.
                  </p>
                  <Button asChild size="sm" className="h-7 text-[8px] font-mono uppercase tracking-widest bg-primary hover:bg-primary/80">
                    <Link href="/chat">Access AI Core</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
