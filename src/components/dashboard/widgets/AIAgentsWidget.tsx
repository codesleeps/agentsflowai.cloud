"use client";

import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AIAgentsWidgetProps {
  stats: any;
}

export function AIAgentsWidget({ stats }: AIAgentsWidgetProps) {
  const agents = [
    { name: "Chat Agent", status: "active", color: "bg-green-500" },
    { name: "Lead Qualifier", status: "active", color: "bg-green-500" },
    { name: "Service Recommender", status: "active", color: "bg-green-500" },
    { name: "Web Developer", status: "active", color: "bg-blue-500" },
    { name: "Analytics Agent", status: "standby", color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-3">
      {agents.map((agent, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-2 w-2 rounded-full ${agent.color} ${
                agent.status === "active" ? "animate-pulse" : ""
              }`}
            />
            <span className="text-sm font-medium">{agent.name}</span>
          </div>
          <Badge
            variant="secondary"
            className={`text-xs ${
              agent.status === "active"
                ? "bg-green-500/20 text-green-700 dark:text-green-400"
                : "bg-purple-500/20 text-purple-700 dark:text-purple-400"
            }`}
          >
            {agent.status === "active" ? "Active" : "Standby"}
          </Badge>
        </div>
      ))}
    </div>
  );
}
