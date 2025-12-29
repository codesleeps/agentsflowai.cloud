"use client";

import { useComprehensiveAnalytics } from "@/client-lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
} from "lucide-react";

interface AppointmentStatisticsWidgetProps {
  stats?: any; // Keep for backward compatibility
}

export function AppointmentStatisticsWidget({
  stats,
}: AppointmentStatisticsWidgetProps) {
  const { data: analytics, isLoading, error } = useComprehensiveAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted"></div>
          <div className="h-4 w-1/2 rounded bg-muted"></div>
          <div className="h-4 w-2/3 rounded bg-muted"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics?.appointmentMetrics) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No appointment data available
        </p>
      </div>
    );
  }

  const { appointmentMetrics } = analytics;
  const {
    totalAppointments,
    upcomingAppointments,
    completionRate,
    noShowRate,
    avgDuration,
    leadToAppointmentRate,
  } = appointmentMetrics;

  // Calculate show rate (the inverse of no-show rate)
  const showRate = 100 - noShowRate;

  return (
    <div className="space-y-4">
      {/* Appointment Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Total
          </div>
          <div className="text-lg font-bold">{totalAppointments}</div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Upcoming
          </div>
          <div className="text-lg font-bold text-blue-600">
            {upcomingAppointments}
          </div>
        </div>
      </div>

      {/* Success Metrics */}
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Completion Rate
            </span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              Show Rate
            </span>
            <span className="font-medium">{showRate}%</span>
          </div>
          <Progress value={showRate} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              No-Show Rate
            </span>
            <span className="font-medium">{noShowRate}%</span>
          </div>
          <Progress value={noShowRate} className="h-2" />
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-2 gap-3 border-t pt-2">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Avg Duration</div>
          <div className="text-sm font-medium">{avgDuration} min</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Lead Conversion</div>
          <div className="text-sm font-medium">{leadToAppointmentRate}%</div>
        </div>
      </div>

      {/* Health Status Indicator */}
      <div className="space-y-2 border-t pt-2">
        <h4 className="text-sm font-medium">Health Status</h4>
        <div className="flex items-center gap-2">
          {completionRate >= 80 && noShowRate <= 20 ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Excellent
            </Badge>
          ) : completionRate >= 60 && noShowRate <= 30 ? (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Good
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              Needs Attention
            </Badge>
          )}

          <span className="text-xs text-muted-foreground">
            {completionRate >= 80 && noShowRate <= 20
              ? "High performance"
              : completionRate >= 60 && noShowRate <= 30
                ? "Moderate performance"
                : "Below target performance"}
          </span>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="space-y-2 border-t pt-2">
        <h4 className="text-sm font-medium">Insights</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          {noShowRate > 30 && (
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              High no-show rate - consider reminders
            </div>
          )}
          {completionRate < 60 && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-yellow-500" />
              Low completion rate - review scheduling
            </div>
          )}
          {leadToAppointmentRate < 10 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              Opportunity to convert more leads
            </div>
          )}
          {totalAppointments === 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              No appointments scheduled yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
