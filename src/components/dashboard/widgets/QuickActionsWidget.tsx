"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Target, Calendar } from "lucide-react";

interface QuickActionsWidgetProps {
  stats: any;
}

export function QuickActionsWidget({ stats }: QuickActionsWidgetProps) {
  const actions = [
    {
      label: "Start AI Conversation",
      href: "/chat",
      icon: MessageSquare,
    },
    {
      label: "Add New Lead",
      href: "/leads/new",
      icon: Users,
    },
    {
      label: "Manage Services",
      href: "/services",
      icon: Target,
    },
    {
      label: "Appointments",
      href: "/appointments",
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-2">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          asChild
          className="w-full justify-start text-xs"
        >
          <Link href={action.href}>
            <action.icon className="mr-2 h-3 w-3" />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
