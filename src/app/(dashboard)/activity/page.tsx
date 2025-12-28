"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Activity,
  Filter,
  Download,
  Calendar,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTypeDescriptions } from "@/lib/activity-log";

interface ActivityLog {
  id: string;
  user_id?: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  resource_type?: string;
  resource_id?: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [filterType, page]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "20",
        offset: ((page - 1) * 20).toString(),
      });

      if (filterType !== "all") {
        params.append("type", filterType);
      }

      const response = await fetch(`/api/activities?${params}`);
      const data = await response.json();

      if (data.success) {
        if (page === 1) {
          setActivities(data.data);
        } else {
          setActivities((prev) => [...prev, ...data.data]);
        }
        setHasMore(data.data.length === 20);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      toast.error("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/activities?limit=1000");
      const data = await response.json();

      if (data.success) {
        const csvContent = convertToCSV(data.data);
        downloadCSV(csvContent, "activity-log.csv");
        toast.success("Activity log exported");
      }
    } catch (error) {
      toast.error("Failed to export activities");
    }
  };

  const convertToCSV = (activities: ActivityLog[]) => {
    const headers = [
      "Date",
      "Type",
      "Description",
      "User",
      "IP Address",
      "Resource",
    ];
    const rows = activities.map((activity) => [
      new Date(activity.created_at).toISOString(),
      activity.type,
      `"${activity.description.replace(/"/g, '""')}"`,
      activity.user?.email || "N/A",
      activity.ip_address || "N/A",
      activity.resource_type
        ? `${activity.resource_type}:${activity.resource_id}`
        : "N/A",
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const filteredActivities = activities.filter((activity) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      activity.description.toLowerCase().includes(query) ||
      activity.type.toLowerCase().includes(query) ||
      activity.user?.email?.toLowerCase().includes(query)
    );
  });

  const activityTypes = Object.keys(ActivityTypeDescriptions).filter(
    (type) => type.startsWith("USER_") || type.startsWith("TEAM_"),
  );

  const getActivityIcon = (type: string) => {
    if (type.includes("LOGIN")) return "🔓";
    if (type.includes("LOGOUT")) return "🔒";
    if (type.includes("TEAM")) return "👥";
    if (type.includes("LEAD")) return "📋";
    if (type.includes("AGENT")) return "🤖";
    if (type.includes("CREATE")) return "✨";
    if (type.includes("UPDATE")) return "📝";
    if (type.includes("DELETE")) return "🗑️";
    return "📌";
  };

  const getActivityColor = (type: string) => {
    if (type.includes("DELETE") || type.includes("REVOKE"))
      return "text-red-500 bg-red-50";
    if (type.includes("CREATE")) return "text-green-500 bg-green-50";
    if (type.includes("UPDATE")) return "text-blue-500 bg-blue-50";
    return "text-gray-500 bg-gray-50";
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Activity className="h-8 w-8 text-primary" />
            Activity Log
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track all user activities and system events
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterType}
              onValueChange={(value) => {
                setFilterType(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                {activityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ActivityTypeDescriptions[
                      type as keyof typeof ActivityTypeDescriptions
                    ] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading && page === 1 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No activities found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div
                    className={`rounded-full p-2 ${getActivityColor(activity.type)}`}
                  >
                    <span className="text-lg">
                      {getActivityIcon(activity.type)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-medium">
                        {ActivityTypeDescriptions[
                          activity.type as keyof typeof ActivityTypeDescriptions
                        ] || activity.type}
                      </p>
                    </div>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                      {activity.user && (
                        <span className="flex items-center gap-1">
                          👤 {activity.user.name || activity.user.email}
                        </span>
                      )}
                      {activity.ip_address && (
                        <span>IP: {activity.ip_address}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {activity.type}
                  </Badge>
                </div>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
