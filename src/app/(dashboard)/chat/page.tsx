"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateAgentResponse, getAgentResponseWithFallback } from "@/client-lib/ai-agents-client";
import { EnhancedChatInput } from "@/components/chat/EnhancedChatInput";
import { ChatArea } from "@/components/chat/ChatArea";
import { cn } from "@/client-lib/utils";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/shared/models/types";
import { toast } from "sonner";


const SERVICES = [
  {
    id: "basic",
    name: "Basic",
    description: "Perfect for getting started with essential features",
    tier: "basic" as const,
    price: 99,
  },
  {
    id: "growth",
    name: "Growth",
    description: "Ideal for growing businesses with advanced features",
    tier: "growth" as const,
    price: 299,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Complete solution for large organizations",
    tier: "enterprise" as const,
    price: 999,
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! 👋 I'm your AI assistant. I'm here to help with any questions or tasks you have. What can I assist you with today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const services = SERVICES;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const messageContent = overrideInput || input;
    if (!messageContent.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: messageContent.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Format conversation history for the agent API
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call the agents API directly to get full metadata
      const response = await fetch("/api/ai/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: "fast-chat-agent",
          message: userMessage.content,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          model: data.model,
          tokensUsed: data.tokensUsed,
          responseTime: data.generationTime,
          usedProvider: data.usedProvider,
          fallbackUsed: data.fallbackUsed,
          note: data.note,
          errorLog: data.errorLog,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Show warning toast if fallback was used or errors occurred
        if (data.fallbackUsed || (data.errorLog && data.errorLog.length > 0)) {
          toast.warning("AI Provider Issues Detected", {
            description: "Using fallback provider. Check system status for details.",
            action: {
              label: "View Status",
              onClick: () => window.location.href = "/ai-agents/diagnostics",
            },
          });
        }
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "I apologize, but I encountered an issue processing your request. Please try again or contact our team directly for assistance.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hello! 👋 I'm your AI assistant. I'm here to help with any questions or tasks you have. What can I assist you with today?",
        timestamp: new Date(),
      },
    ]);
  };

  const quickQuestions = [
    "What services do you offer?",
    "Which package is best for a small business?",
    "How does AI lead qualification work?",
    "I need help with digital marketing",
    "What's included in the Enterprise package?",
  ];

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                AI Chat Agent
                <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                  Online
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Powered by AgentsFlowAI
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-transparent">
        <div className="flex-1 flex flex-col">
          <ChatArea
            messages={messages.map(m => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))}
            isLoading={isLoading}
            agentName="Chat Agent"
          />

          {messages.length <= 2 && (
            <div className="p-4 border-t bg-muted/30 pt-2">
              <p className="text-sm text-muted-foreground mb-3">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((question) => (
                  <Button
                    key={question}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(question)}
                    className="text-xs"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t bg-background/50 backdrop-blur-sm pt-2">
            <EnhancedChatInput
              onSend={(val) => handleSend(val)}
              isLoading={isLoading}
              models={[
                { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", isNew: true },
                { id: "gemini-2.5-flash-image", name: "Nano Banana", provider: "Google", isNew: true },
                { id: "claude-sonnet", name: "Claude Sonnet", provider: "Anthropic" }
              ]}
              selectedModelId="gemini-2.5-flash"
            />
          </div>
        </div>

        <div className="hidden lg:block w-80 border-l p-4 overflow-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Our Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {services?.map((service) => (
                <div
                  key={service.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{service.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {service.tier}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    ${service.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {service.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Need Human Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Our team is available to answer complex questions and provide personalized consultations.
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/leads/new">Schedule a Consultation</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
