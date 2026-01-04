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
    <Card className={`hud-card group ${getSizeClasses()} ${className || ""}`}>
      {/* HUD Background elements could be added here */}

      <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="hud-header">[{widget.id.toUpperCase()}]</div>
            <div className="flex items-center gap-2">
              <widget.icon className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold uppercase tracking-tighter text-white/90">
                {widget.title}
              </CardTitle>
            </div>
            {widget.description && (
              <CardDescription className="text-[9px] font-mono mt-0.5 text-white/40 uppercase tracking-widest">
                {widget.description}
              </CardDescription>
            )}
          </div>

          {/* Simplified HUD Controls */}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 scale-75 origin-right">
            {widget.configurable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-primary/20 hover:bg-primary/20">
                    <Settings className="h-3 w-3 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="hud-card border-primary/20 bg-black/90">
                  <DropdownMenuItem onClick={() => handleSizeChange("small")} className="text-[10px] font-mono uppercase tracking-widest hover:bg-primary/20">Small</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSizeChange("medium")} className="text-[10px] font-mono uppercase tracking-widest hover:bg-primary/20">Medium</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSizeChange("large")} className="text-[10px] font-mono uppercase tracking-widest hover:bg-primary/20">Large</DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-primary/20" />
                  <DropdownMenuItem onClick={() => handleToggleVisibility()} className="text-[10px] font-mono uppercase tracking-widest text-red-400 hover:bg-red-400/20">Disable</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-6 w-6 p-0 border border-primary/20 hover:bg-primary/20"
            >
              {isCollapsed ? (
                <ChevronDown className="h-3 w-3 text-primary" />
              ) : (
                <ChevronUp className="h-3 w-3 text-primary" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-4 animate-fadeIn">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
