"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Users,
  TrendingUp,
  Calendar,
  MessageSquare,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Target,
  Zap,
  Code,
  Lock,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAuthClient } from "@/client-lib/auth-client";
import { useDashboardStats } from "@/client-lib/api-client";
import { WidgetManager } from "@/components/dashboard/WidgetManager";

// Date range presets
const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This month", days: 30, isCurrentMonth: true },
  { label: "Last month", days: 30, isLastMonth: true },
];

// Helper function to format date for input
function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper function to get preset date range
function getPresetDateRange(preset: (typeof DATE_PRESETS)[0]): {
  start: Date;
  end: Date;
} {
  const today = new Date();

  if (preset.isCurrentMonth) {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59),
    };
  }

  if (preset.isLastMonth) {
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59),
    };
  }

  const end = today;
  const start = new Date(today.getTime() - preset.days * 24 * 60 * 60 * 1000);

  return { start, end };
}

const statusColors: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  qualified: "bg-green-500",
  proposal: "bg-purple-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

const sourceIcons: Record<string, string> = {
  website: "🌐",
  chat: "💬",
  referral: "🤝",
  ads: "📢",
};

export default function DashboardPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    () => {
      // Default to current month
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
      return {
        start: formatDateForInput(start),
        end: formatDateForInput(end),
      };
    },
  );
  const [customRange, setCustomRange] = useState(false);

  const { data: stats, isLoading } = useDashboardStats(
    dateRange.start,
    dateRange.end,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const handlePresetSelect = (preset: (typeof DATE_PRESETS)[0]) => {
    const range = getPresetDateRange(preset);
    setDateRange({
      start: formatDateForInput(range.start),
      end: formatDateForInput(range.end),
    });
    setCustomRange(false);
  };

  const handleCustomDateChange = (field: "start" | "end", value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
    setCustomRange(true);
  };

  useEffect(() => {
    // Check authentication
    const auth = getAuthClient();
    if (auth.data?.user) {
      setIsAuthenticated(true);
    } else {
      // Redirect to welcome if not authenticated
      router.replace("/welcome");
    }
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Bot className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Bot className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Sparkles className="h-8 w-8 text-primary" />
            AgentsFlowAI
          </h1>
          <p className="mt-1 text-muted-foreground">
            AI-Powered Business Automation Dashboard
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Date Range Controls */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Period:</span>
            <div className="flex gap-1">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant={!customRange ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetSelect(preset)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleCustomDateChange("start", e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleCustomDateChange("end", e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
            {customRange && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const today = new Date();
                  const start = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1,
                  );
                  const end = new Date(
                    today.getFullYear(),
                    today.getMonth() + 1,
                    0,
                    23,
                    59,
                    59,
                  );
                  setDateRange({
                    start: formatDateForInput(start),
                    end: formatDateForInput(end),
                  });
                  setCustomRange(false);
                }}
                className="text-xs"
              >
                Reset
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button asChild>
              <Link href="/chat">
                <MessageSquare className="mr-2 h-4 w-4" />
                AI Chat Agent
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/leads">
                <Users className="mr-2 h-4 w-4" />
                Manage Leads
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads ?? 0}</div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {stats?.periodComparison && (
                <>
                  <ArrowUpRight
                    className={`h-3 w-3 ${
                      stats.periodComparison.growthPercentage >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  />
                  <span
                    className={
                      stats.periodComparison.growthPercentage >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {stats.periodComparison.growthPercentage >= 0 ? "+" : ""}
                    {stats.periodComparison.growthPercentage}%
                  </span>
                </>
              )}
              {stats?.monthlyGrowth && !stats?.periodComparison && (
                <>
                  <ArrowUpRight
                    className={`h-3 w-3 ${
                      stats.monthlyGrowth.percentage >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  />
                  <span
                    className={
                      stats.monthlyGrowth.percentage >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {stats.monthlyGrowth.percentage >= 0 ? "+" : ""}
                    {stats.monthlyGrowth.percentage}%
                  </span>
                </>
              )}
              from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Qualified Leads
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.qualifiedLeads ?? 0}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-primary">
                {stats?.conversionRate ?? 0}%
              </span>{" "}
              conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeConversations ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              AI agents handling inquiries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.revenue ?? 0).toLocaleString()}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+23%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      {(stats?.aiUsage || stats?.emailMetrics) && (
        <div className="grid gap-4 md:grid-cols-3">
          {stats?.aiUsage && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  AI Requests
                </CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(
                    stats.aiUsage?.requestsThisPeriod ||
                    stats.aiUsage?.requestsThisMonth ||
                    0
                  ).toLocaleString()}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats.dateRange ? "This period" : "This month"}
                </p>
              </CardContent>
            </Card>
          )}

          {stats?.emailMetrics && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Email Open Rate
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.emailMetrics.openRate}%
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stats.emailMetrics.totalOpened.toLocaleString()} opened
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Appointments
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.upcomingAppointments ?? 0}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Upcoming</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Dashboard Widgets */}
      <WidgetManager stats={stats} />
    </div>
  );
}
