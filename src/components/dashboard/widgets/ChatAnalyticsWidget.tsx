"use client";

import { useComprehensiveAnalytics } from "@/client-lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Clock, Smile, Frown, Meh, Zap } from "lucide-react";

interface ChatAnalyticsWidgetProps {
  stats?: any; // Keep for backward compatibility
}

export function ChatAnalyticsWidget({ stats }: ChatAnalyticsWidgetProps) {
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

  if (error || !analytics?.conversationMetrics) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">No chat data available</p>
      </div>
    );
  }

  const { conversationMetrics } = analytics;
  const {
    totalConversations,
    activeConversations,
    avgResponseTime,
    sentimentAnalysis,
    channelPerformance,
  } = conversationMetrics;

  // Calculate sentiment distribution
  const sentimentCounts = sentimentAnalysis.reduce(
    (acc, item) => {
      acc[item.sentiment] = item.count;
      return acc;
    },
    {} as Record<string, number>,
  );

  const positiveCount = sentimentCounts.positive || 0;
  const neutralCount = sentimentCounts.neutral || 0;
  const negativeCount = sentimentCounts.negative || 0;
  const totalSentimentCount = positiveCount + neutralCount + negativeCount;

  const positiveRate =
    totalSentimentCount > 0
      ? Math.round((positiveCount / totalSentimentCount) * 100)
      : 0;
  const negativeRate =
    totalSentimentCount > 0
      ? Math.round((negativeCount / totalSentimentCount) * 100)
      : 0;

  // Channel performance analysis
  const bestChannel =
    channelPerformance.length > 0
      ? channelPerformance.reduce((best, current) =>
          current.satisfaction > best.satisfaction ? current : best,
        )
      : null;

  return (
    <div className="space-y-4">
      {/* Conversation Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            Total
          </div>
          <div className="text-lg font-bold">{totalConversations}</div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            Active
          </div>
          <div className="text-lg font-bold text-green-600">
            {activeConversations}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Avg Response Time
          </span>
          <span className="font-medium">
            {avgResponseTime > 0 ? `${avgResponseTime}ms` : "N/A"}
          </span>
        </div>
      </div>

      {/* Sentiment Analysis */}
      {totalSentimentCount > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Customer Sentiment</h4>

          {/* Sentiment Icons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smile className="h-4 w-4 text-green-500" />
              <span className="text-sm">{positiveCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Meh className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">{neutralCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Frown className="h-4 w-4 text-red-500" />
              <span className="text-sm">{negativeCount}</span>
            </div>
          </div>

          {/* Sentiment Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <Smile className="h-3 w-3" />
                Positive
              </span>
              <span className="font-medium">{positiveRate}%</span>
            </div>
            <Progress value={positiveRate} className="h-1" />
          </div>

          {negativeRate > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-red-600">
                  <Frown className="h-3 w-3" />
                  Negative
                </span>
                <span className="font-medium">{negativeRate}%</span>
              </div>
              <Progress value={negativeRate} className="h-1" />
            </div>
          )}
        </div>
      )}

      {/* Channel Performance */}
      {channelPerformance.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Channel Performance</h4>
          <div className="space-y-2">
            {channelPerformance.slice(0, 3).map((channel, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium capitalize">
                    {channel.channel}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {channel.conversations} chats
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        channel.satisfaction >= 90
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : channel.satisfaction >= 75
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {channel.satisfaction}%
                    </Badge>
                  </div>
                </div>
                <Progress value={channel.satisfaction} className="h-1" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Indicators */}
      <div className="space-y-2 border-t pt-2">
        <h4 className="text-sm font-medium">Chat Health</h4>
        <div className="flex items-center gap-2">
          {positiveRate >= 70 && negativeRate <= 10 ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Excellent
            </Badge>
          ) : positiveRate >= 50 && negativeRate <= 20 ? (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Good
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              Needs Attention
            </Badge>
          )}

          <span className="text-xs text-muted-foreground">
            {positiveRate >= 70 && negativeRate <= 10
              ? "High customer satisfaction"
              : positiveRate >= 50 && negativeRate <= 20
                ? "Moderate satisfaction levels"
                : "Customer satisfaction needs improvement"}
          </span>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="space-y-2 border-t pt-2">
        <h4 className="text-sm font-medium">Insights</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          {negativeRate > 20 && (
            <div className="flex items-center gap-1">
              <Frown className="h-3 w-3 text-red-500" />
              High negative sentiment - review responses
            </div>
          )}
          {avgResponseTime > 5000 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              Slow response times - optimize workflows
            </div>
          )}
          {bestChannel && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-green-500" />
              Best channel: {bestChannel.channel} ({bestChannel.satisfaction}%)
            </div>
          )}
          {totalConversations === 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              No conversations yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
