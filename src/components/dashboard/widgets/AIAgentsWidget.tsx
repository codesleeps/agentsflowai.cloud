"use client";

import { Bot, Zap, Cpu } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AIAgentsWidgetProps {
  stats: any;
}

export function AIAgentsWidget({ stats }: AIAgentsWidgetProps) {
  const agents = [
    { name: "Chat Agent", status: "active", uptime: "99.9%", load: 12, provider: "Gemini 2.0" },
    { name: "Lead Qualifier", status: "active", uptime: "100%", load: 45, provider: "Gemma 2 (local)" },
    { name: "Web Developer", status: "active", uptime: "98.5%", load: 82, provider: "CodeGemma (local)" },
    { name: "Analytics Agent", status: "standby", uptime: "N/A", load: 0, provider: "Ministral" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {agents.map((agent, index) => (
        <div
          key={index}
          className="hud-card p-4 border-primary/10 bg-black/40 group hover:bg-primary/5 transition-all"
        >
          <div className="hud-header flex justify-between">
            <span>[UNIT_0{index + 1}]</span>
            <span className={agent.status === "active" ? "text-green-500" : "text-purple-500"}>
              {agent.status.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className={`p-2 border border-primary/20 bg-primary/5 ${agent.status === "active" ? "hud-status-dot pulse" : ""}`}>
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase italic tracking-tighter">{agent.name}</h3>
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{agent.provider}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[8px] font-mono uppercase text-white/30">
                <span>Processing Load</span>
                <span>{agent.load}%</span>
              </div>
              <Progress value={agent.load} className="h-0.5 bg-primary/5" />
            </div>

            <div className="flex justify-between items-center text-[9px] font-mono">
              <div className="flex items-center gap-1 text-white/40">
                <Cpu className="h-3 w-3" />
                <span>UPTIME: {agent.uptime}</span>
              </div>
              <div className="flex items-center gap-1 text-primary">
                <Zap className="h-3 w-3" />
                <span>SYNC READY</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
