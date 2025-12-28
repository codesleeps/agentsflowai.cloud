"use client";

import {
  TrendingUp,
  Users,
  DollarSign,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Calendar,
  Mail,
  Target,
  Activity,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  useDashboardStats,
  useComprehensiveAnalytics,
} from "@/client-lib/api-client";

const leadTrendData = [
  { month: "Jan", leads: 45, qualified: 18 },
  { month: "Feb", leads: 52, qualified: 22 },
  { month: "Mar", leads: 68, qualified: 30 },
  { month: "Apr", leads: 75, qualified: 35 },
  { month: "May", leads: 85, qualified: 42 },
  { month: "Jun", leads: 92, qualified: 48 },
];

const conversionData = [
  { month: "Jan", rate: 40 },
  { month: "Feb", rate: 42 },
  { month: "Mar", rate: 44 },
  { month: "Apr", rate: 47 },
  { month: "May", rate: 49 },
  { month: "Jun", rate: 52 },
];

const revenueData = [
  { month: "Jan", revenue: 12500 },
  { month: "Feb", revenue: 15000 },
  { month: "Mar", revenue: 18500 },
  { month: "Apr", revenue: 22000 },
  { month: "May", revenue: 28000 },
  { month: "Jun", revenue: 35000 },
];

const COLORS = ["#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];

const leadChartConfig = {
  leads: { label: "Total Leads", color: "#3b82f6" },
  qualified: { label: "Qualified", color: "#22c55e" },
} satisfies ChartConfig;

const conversionChartConfig = {
  rate: { label: "Conversion Rate", color: "#8b5cf6" },
} satisfies ChartConfig;

const revenueChartConfig = {
  revenue: { label: "Revenue", color: "#22c55e" },
} satisfies ChartConfig;

export default function AnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: analytics, isLoading: analyticsLoading } =
    useComprehensiveAnalytics();

  const isLoading = statsLoading || analyticsLoading;

  // Prepare chart data from comprehensive analytics
  const leadTrendData = analytics?.leadTrends?.monthly || [];
  const conversionData =
    analytics?.leadTrends?.monthly?.map((item) => ({
      month: item.month,
      rate:
        item.leads > 0 ? Math.round((item.qualified / item.leads) * 100) : 0,
    })) || [];

  const revenueData = analytics?.revenueData?.monthlyRevenue || [];

  const aiUsageData =
    analytics?.aiMetrics?.modelUsage?.map((item) => ({
      model: item.model,
      requests: item.requests,
      avgTokens: item.avgTokens,
    })) || [];

  const statusPieData =
    analytics?.leadTrends?.statusDistribution?.map((item, index) => ({
      name: item.status,
      value: item.count,
      fill: COLORS[index % COLORS.length],
    })) || [];

  const sourcePieData =
    analytics?.leadTrends?.sourceAnalysis?.map((item, index) => ({
      name: item.source,
      value: item.count,
      fill: COLORS[index % COLORS.length],
    })) || [];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <TrendingUp className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <TrendingUp className="h-8 w-8 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track your business performance and AI agent metrics
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads ?? 0}</div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {analytics?.leadTrends?.monthly &&
                analytics.leadTrends.monthly.length > 1 && (
                  <>
                    <ArrowUpRight
                      className={`h-3 w-3 ${
                        analytics.leadTrends.monthly[
                          analytics.leadTrends.monthly.length - 1
                        ].leads >=
                        analytics.leadTrends.monthly[
                          analytics.leadTrends.monthly.length - 2
                        ].leads
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    />
                    <span
                      className={
                        analytics.leadTrends.monthly[
                          analytics.leadTrends.monthly.length - 1
                        ].leads >=
                        analytics.leadTrends.monthly[
                          analytics.leadTrends.monthly.length - 2
                        ].leads
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {Math.abs(
                        Math.round(
                          ((analytics.leadTrends.monthly[
                            analytics.leadTrends.monthly.length - 1
                          ].leads -
                            analytics.leadTrends.monthly[
                              analytics.leadTrends.monthly.length - 2
                            ].leads) /
                            analytics.leadTrends.monthly[
                              analytics.leadTrends.monthly.length - 2
                            ].leads) *
                            100,
                        ),
                      )}
                      %
                    </span>
                  </>
                )}
              vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.conversionRate ?? 0}%
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+5%</span> improvement
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
              $
              {(
                analytics?.revenueData?.totalRevenue ??
                stats?.revenue ??
                0
              ).toLocaleString()}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+23%</span> growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.aiMetrics?.totalRequests ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {analytics?.aiMetrics?.successfulRequests ?? 0} successful
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics Row */}
      {(analytics?.emailAnalytics || analytics?.appointmentMetrics) && (
        <div className="grid gap-4 md:grid-cols-4">
          {analytics?.emailAnalytics && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Email Open Rate
                  </CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.emailAnalytics.openRate}%
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {analytics.emailAnalytics.totalEmailsSent.toLocaleString()}{" "}
                    sent
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
                    {analytics.appointmentMetrics?.totalAppointments ?? 0}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {analytics.appointmentMetrics?.completionRate ?? 0}%
                    completion rate
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {analytics?.conversationMetrics && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Chats
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.conversationMetrics.activeConversations}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Avg {analytics.conversationMetrics.avgResponseTime}ms response
                </p>
              </CardContent>
            </Card>
          )}

          {analytics?.userActivity && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Activities
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.userActivity.totalActivities}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Total logged
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Trends</CardTitle>
            <CardDescription>
              Total leads vs qualified leads over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={leadChartConfig} className="h-[300px]">
              <BarChart data={leadTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="leads"
                  fill="var(--color-leads)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="qualified"
                  fill="var(--color-qualified)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate Trend</CardTitle>
            <CardDescription>
              Lead-to-qualified conversion rate over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={conversionChartConfig}
              className="h-[300px]"
            >
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--color-rate)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-rate)" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>Monthly revenue from closed deals</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-[300px]">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
            <CardDescription>Current lead status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center">
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Distribution by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center">
              {sourcePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourcePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {sourcePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Agent Performance</CardTitle>
          <CardDescription>
            Key metrics for AI-powered automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <p className="mt-1 text-2xl font-bold">
                {analytics?.aiMetrics?.avgResponseTime
                  ? `${analytics.aiMetrics.avgResponseTime}ms`
                  : "1.2s"}
              </p>
              <p className="mt-1 text-xs text-green-500">
                <ArrowDownRight className="inline h-3 w-3" /> 0.3s faster
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">AI Requests</p>
              <p className="mt-1 text-2xl font-bold">
                {analytics?.aiMetrics?.totalRequests?.toLocaleString() || "892"}
              </p>
              <p className="mt-1 text-xs text-green-500">
                <ArrowUpRight className="inline h-3 w-3" />
                {analytics?.aiMetrics?.successfulRequests
                  ? `${Math.round((analytics.aiMetrics.successfulRequests / analytics.aiMetrics.totalRequests) * 100)}% success`
                  : "+156 this week"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Leads Qualified</p>
              <p className="mt-1 text-2xl font-bold">
                {stats?.qualifiedLeads ?? 0}
              </p>
              <p className="mt-1 text-xs text-green-500">
                <ArrowUpRight className="inline h-3 w-3" /> Automated
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
              <p className="mt-1 text-2xl font-bold">
                {analytics?.conversationMetrics?.channelPerformance?.length > 0
                  ? Math.round(
                      analytics.conversationMetrics.channelPerformance.reduce(
                        (sum, channel) => sum + channel.satisfaction,
                        0,
                      ) /
                        analytics.conversationMetrics.channelPerformance.length,
                    )
                  : "94"}
                %
              </p>
              <p className="mt-1 text-xs text-green-500">
                <ArrowUpRight className="inline h-3 w-3" /> +2% improvement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Analytics */}
      {analytics?.predictions && (
        <Card>
          <CardHeader>
            <CardTitle>Predictive Analytics</CardTitle>
            <CardDescription>AI-powered insights and forecasts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Next Month Leads
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {analytics.predictions.nextMonthLeads}
                </p>
                <p className="mt-1 text-xs text-blue-500">Projected</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Projected Revenue
                </p>
                <p className="mt-1 text-2xl font-bold">
                  ${analytics.predictions.projectedRevenue.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-blue-500">Next 30 days</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Conversion Probability
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {analytics.predictions.conversionProbability}%
                </p>
                <p className="mt-1 text-xs text-blue-500">Average rate</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Churn Risk</p>
                <p className="mt-1 text-2xl font-bold">
                  {Math.round(analytics.predictions.churnRisk)}%
                </p>
                <p className="mt-1 text-xs text-yellow-500">Low risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
