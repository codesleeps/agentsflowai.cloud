"use client";

import { useState } from "react";
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
  MoreHorizontal,
  Settings,
  Eye,
  EyeOff,
  GripVertical,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardWidget, WidgetConfig } from "@/lib/dashboard/widgets";

interface WidgetContainerProps {
  widget: DashboardWidget;
  config: WidgetConfig;
  onUpdateConfig: (config: WidgetConfig) => void;
  children: React.ReactNode;
  className?: string;
}

export function WidgetContainer({
  widget,
  config,
  onUpdateConfig,
  children,
  className,
}: WidgetContainerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleVisibility = () => {
    onUpdateConfig({
      ...config,
      enabled: !config.enabled,
    });
  };

  const handleSizeChange = (size: "small" | "medium" | "large") => {
    onUpdateConfig({
      ...config,
      size,
    });
  };

  const getSizeClasses = () => {
    switch (config.size) {
      case "small":
        return "lg:col-span-1";
      case "medium":
        return "lg:col-span-1 md:col-span-1";
      case "large":
        return "lg:col-span-2 md:col-span-2";
      default:
        return "lg:col-span-1";
    }
  };

  if (!config.enabled) {
    return null;
  }

  return (
    <Card className={`group relative ${getSizeClasses()} ${className || ""}`}>
      {/* Widget Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <widget.icon className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{widget.title}</CardTitle>
              {widget.description && (
                <CardDescription className="text-xs">
                  {widget.description}
                </CardDescription>
              )}
            </div>
          </div>

          {/* Widget Controls */}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>

            {widget.configurable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleToggleVisibility()}>
                    {config.enabled ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Hide Widget
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Show Widget
                      </>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleSizeChange("small")}>
                    <GripVertical className="mr-2 h-4 w-4" />
                    Small Size
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSizeChange("medium")}>
                    <GripVertical className="mr-2 h-4 w-4" />
                    Medium Size
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSizeChange("large")}>
                    <GripVertical className="mr-2 h-4 w-4" />
                    Large Size
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() =>
                      onUpdateConfig({ ...config, enabled: false })
                    }
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove Widget
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Category Badge */}
        <div className="flex justify-end">
          <Badge variant="secondary" className="text-xs">
            {widget.category}
          </Badge>
        </div>
      </CardHeader>

      {/* Widget Content */}
      {!isCollapsed && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
