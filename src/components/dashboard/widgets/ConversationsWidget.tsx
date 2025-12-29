"use client";

interface ConversationsWidgetProps {
  stats: any;
}

export function ConversationsWidget({ stats }: ConversationsWidgetProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Active Conversations</span>
        <span className="text-2xl font-bold">
          {stats?.activeConversations ?? 0}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        AI agents handling inquiries
      </p>
    </div>
  );
}
