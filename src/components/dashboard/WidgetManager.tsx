"use client";

import { useState, useEffect } from "react";
import { WidgetContainer } from "./WidgetContainer";
import {
  DashboardWidget,
  WidgetConfig,
  getAllWidgets,
  getDefaultWidgetConfig,
} from "@/lib/dashboard/widgets";
import { StatsOverviewWidget } from "./widgets/StatsOverviewWidget";
import { AIAgentsWidget } from "./widgets/AIAgentsWidget";
import { LeadPipelineWidget } from "./widgets/LeadPipelineWidget";
import { LeadSourcesWidget } from "./widgets/LeadSourcesWidget";
import { RecentLeadsWidget } from "./widgets/RecentLeadsWidget";
import { QuickActionsWidget } from "./widgets/QuickActionsWidget";
import { AppointmentsWidget } from "./widgets/AppointmentsWidget";
import { ConversationsWidget } from "./widgets/ConversationsWidget";
import { EmailMetricsWidget } from "./widgets/EmailMetricsWidget";
import { AIUsageWidget } from "./widgets/AIUsageWidget";
import { AIUsageAnalyticsWidget } from "./widgets/AIUsageAnalyticsWidget";
import { LeadConversionAnalyticsWidget } from "./widgets/LeadConversionAnalyticsWidget";
import { AppointmentStatisticsWidget } from "./widgets/AppointmentStatisticsWidget";
import { ChatAnalyticsWidget } from "./widgets/ChatAnalyticsWidget";

interface WidgetManagerProps {
  stats: any;
  className?: string;
}

export function WidgetManager({ stats, className }: WidgetManagerProps) {
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);

  // Initialize widgets and configs
  useEffect(() => {
    const allWidgets = getAllWidgets();
    const defaultConfigs = getDefaultWidgetConfig();

    setWidgets(allWidgets);

    // Load from localStorage or use defaults
    const savedConfigs = localStorage.getItem("dashboard-widget-configs");
    if (savedConfigs) {
      try {
        const parsed = JSON.parse(savedConfigs);
        setWidgetConfigs(parsed);
      } catch (error) {
        console.error("Failed to parse saved widget configs:", error);
        setWidgetConfigs(defaultConfigs);
      }
    } else {
      setWidgetConfigs(defaultConfigs);
    }
  }, []);

  // Save configs to localStorage whenever they change
  useEffect(() => {
    if (widgetConfigs.length > 0) {
      localStorage.setItem(
        "dashboard-widget-configs",
        JSON.stringify(widgetConfigs),
      );
    }
  }, [widgetConfigs]);

  const handleUpdateConfig = (updatedConfig: WidgetConfig) => {
    setWidgetConfigs((prev) =>
      prev.map((config) =>
        config.id === updatedConfig.id ? updatedConfig : config,
      ),
    );
  };

  const renderWidget = (widget: DashboardWidget) => {
    const config = widgetConfigs.find((c) => c.id === widget.id);
    if (!config) return null;

    const widgetProps = { stats };

    switch (widget.component) {
      case "StatsOverviewWidget":
        return <StatsOverviewWidget {...widgetProps} />;
      case "AIUsageAnalyticsWidget":
        return <AIUsageAnalyticsWidget {...widgetProps} />;
      case "LeadConversionAnalyticsWidget":
        return <LeadConversionAnalyticsWidget {...widgetProps} />;
      case "AppointmentStatisticsWidget":
        return <AppointmentStatisticsWidget {...widgetProps} />;
      case "ChatAnalyticsWidget":
        return <ChatAnalyticsWidget {...widgetProps} />;
      case "AIAgentsWidget":
        return <AIAgentsWidget {...widgetProps} />;
      case "LeadPipelineWidget":
        return <LeadPipelineWidget {...widgetProps} />;
      case "LeadSourcesWidget":
        return <LeadSourcesWidget {...widgetProps} />;
      case "RecentLeadsWidget":
        return <RecentLeadsWidget {...widgetProps} />;
      case "QuickActionsWidget":
        return <QuickActionsWidget {...widgetProps} />;
      case "AppointmentsWidget":
        return <AppointmentsWidget {...widgetProps} />;
      case "ConversationsWidget":
        return <ConversationsWidget {...widgetProps} />;
      case "EmailMetricsWidget":
        return <EmailMetricsWidget {...widgetProps} />;
      case "AIUsageWidget":
        return <AIUsageWidget {...widgetProps} />;
      default:
        return (
          <div className="p-4 text-center text-muted-foreground">
            Widget component &quot;{widget.component}&quot; not found
          </div>
        );
    }
  };

  // Sort widgets by position
  const sortedWidgets = widgets
    .filter((widget) =>
      widgetConfigs.find((config) => config.id === widget.id && config.enabled),
    )
    .sort((a, b) => {
      const configA = widgetConfigs.find((c) => c.id === a.id);
      const configB = widgetConfigs.find((c) => c.id === b.id);
      return (configA?.position || 0) - (configB?.position || 0);
    });

  if (widgetConfigs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading dashboard widgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${className || ""}`}
    >
      {sortedWidgets.map((widget) => {
        const config = widgetConfigs.find((c) => c.id === widget.id);
        if (!config) return null;

        return (
          <WidgetContainer
            key={widget.id}
            widget={widget}
            config={config}
            onUpdateConfig={handleUpdateConfig}
          >
            {renderWidget(widget)}
          </WidgetContainer>
        );
      })}

      {sortedWidgets.length === 0 && (
        <div className="col-span-full">
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
            <p className="mb-4 text-muted-foreground">No widgets enabled</p>
            <p className="text-sm text-muted-foreground">
              Use the widget controls to enable and configure your dashboard
              widgets
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
