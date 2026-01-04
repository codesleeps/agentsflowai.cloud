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
import {
  Settings,
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
    onUpdateConfig({ ...config, enabled: !config.enabled });
  };

  const handleSizeChange = (size: "small" | "medium" | "large") => {
    onUpdateConfig({ ...config, size });
  };

  const getSizeClasses = () => {
    switch (config.size) {
      case "small": return "lg:col-span-1";
      case "medium": return "lg:col-span-1 md:col-span-1";
      case "large": return "lg:col-span-2 md:col-span-2";
      default: return "lg:col-span-1";
    }
  };

  if (!config.enabled) return null;

  // Choose hud theme based on widget ID or category
  const isTurquoiseSection = ["ai-usage", "lead-conversion", "chat-analytics"].includes(widget.id);

  return (
    <Card className={`hud-card group ${getSizeClasses()} ${className || ""} hover:bg-white/[0.01] transition-all`}>
      <CardHeader className="pb-3 border-b border-white/[0.03] bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className={`hud-header ${isTurquoiseSection ? 'hud-header-turquoise' : ''}`}>[{widget.id.toUpperCase()}]</div>
            <div className="flex items-center gap-2.5">
              <widget.icon className={`h-4 w-4 ${isTurquoiseSection ? 'text-secondary' : 'text-primary'}`} />
              <CardTitle className="text-[12px] font-black uppercase tracking-widest text-white/90">
                {widget.title}
              </CardTitle>
            </div>
            {widget.description && (
              <CardDescription className="text-[8px] font-mono mt-0.5 text-white/40 uppercase tracking-[0.2em]">
                {widget.description}
              </CardDescription>
            )}
          </div>

          <div className="flex items-center gap-2 opacity-30 transition-opacity group-hover:opacity-100 scale-90 origin-right">
            {widget.configurable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 border border-white/5 hover:bg-white/10 rounded-none">
                    <Settings className="h-3 w-3 text-white/60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="hud-card border-white/10 bg-black/90 rounded-none min-w-[120px]">
                  <DropdownMenuItem onClick={() => handleSizeChange("small")} className="text-[9px] font-mono uppercase tracking-widest hover:bg-primary/20 cursor-pointer">Small</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSizeChange("medium")} className="text-[9px] font-mono uppercase tracking-widest hover:bg-primary/20 cursor-pointer">Medium</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSizeChange("large")} className="text-[9px] font-mono uppercase tracking-widest hover:bg-primary/20 cursor-pointer">Large</DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem onClick={() => handleToggleVisibility()} className="text-[9px] font-mono uppercase tracking-widest text-red-500 hover:bg-red-500/10 cursor-pointer">Disable</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-6 w-6 p-0 border border-white/5 hover:bg-white/10 rounded-none"
            >
              {isCollapsed ? (
                <ChevronDown className="h-3 w-3 text-white/60" />
              ) : (
                <ChevronUp className="h-3 w-3 text-white/60" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-5 animate-fadeIn">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
