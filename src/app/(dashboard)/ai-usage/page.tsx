"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";

const fetchUsageData = async (dateRange: any) => {
  const { from, to } = dateRange;
  const res = await fetch(
    `/api/ai/usage?startDate=${from.toISOString()}&endDate=${to.toISOString()}`,
  );
  if (!res.ok) {
    throw new Error("Failed to fetch usage data");
  }
  return res.json();
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function UsageAnalyticsPage() {
  const [dateRange, setDateRange] = useState<any>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const {
    data: usageData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["aiUsage", dateRange],
    queryFn: () => fetchUsageData(dateRange),
  });

  const totalTokens =
    usageData?.reduce(
      (acc: any, item: any) => acc + item._sum.total_tokens,
      0,
    ) || 0;
  const totalCost =
    usageData?.reduce((acc: any, item: any) => acc + item._sum.cost_usd, 0) ||
    0;
  const totalRequests =
    usageData?.reduce((acc: any, item: any) => acc + item._count._all, 0) || 0;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-3xl font-bold">AI Usage Analytics</h1>

      <div className="mb-4">
        <DateRangePicker value={dateRange} onValueChange={setDateRange} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCost.toFixed(4)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalRequests.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tokens by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usageData}
                  dataKey="_sum.total_tokens"
                  nameKey="provider"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label
                >
                  {usageData?.map((entry: any, index: any) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageData}>
                <XAxis dataKey="agent_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="_sum.cost_usd" fill="#82ca9d" name="Cost (USD)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
