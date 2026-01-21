"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { EnhancedChatInput } from "@/components/chat/EnhancedChatInput";
import { ChatArea } from "@/components/chat/ChatArea";
import { cn } from "@/client-lib/utils";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  tokensUsed?: number;
  responseTime?: number;
  usedProvider?: string;
  fallbackUsed?: boolean;
  note?: string;
  errorLog?: Array<{
    provider: string;
    model: string;
    error: string;
    duration: number;
  }>;
}

export default function FastChatPage() {
  const [selectedModelId, setSelectedModelId] = useState("deepseek/deepseek-chat:free");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your Fast Chat assistant. I can help you with general questions, brainstorming, and quick tasks. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [hasProviderIssues, setHasProviderIssues] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const messageContent = overrideInput || input;
    if (!messageContent.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setConversationStarted(true);

    try {
      const response = await fetch("/api/ai/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId:
            selectedModelId === "deepseek/deepseek-chat:free" ? "fast-chat-agent" :
              selectedModelId === "z-ai/glm-4.5-air" ? "gemini-agent" : // Note: gemini-agent renamed to Advanced Reasoning Agent but ID kept for compatibility
                selectedModelId === "mistral:7b" ? "fast-chat-agent" :
                  "fast-chat-agent",
          message: messageContent.trim(),
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
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
          setHasProviderIssues(true);
          toast.warning("AI Provider Issues Detected", {
            description: `${data.fallbackUsed ? 'Fallback provider activated. ' : ''}${data.errorLog?.length || 0} provider(s) failed.`,
            action: {
              label: "View Diagnostics",
              onClick: () => window.location.href = "/ai-agents/diagnostics",
            },
            duration: 8000,
          });
        } else {
          // Reset flag if no issues
          setHasProviderIssues(false);
        }
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please try again in a moment or check the system status.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setHasProviderIssues(true);
      toast.error("Connection Error", {
        description: "Unable to reach AI providers. Check system diagnostics.",
        action: {
          label: "View Diagnostics",
          onClick: () => window.location.href = "/ai-agents/diagnostics",
        },
        duration: 8000,
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: string) => {
    handleSend(action);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm your Fast Chat assistant powered by local Ollama. I can help you with general questions, brainstorming, and quick tasks. How can I assist you today?",
        timestamp: new Date(),
      },
    ]);
    setConversationStarted(false);
    toast.success("Chat cleared!");
  };

  return (
    <div className="flex h-screen flex-col bg-premium-chat">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Fast Chat</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "transition-all",
                    hasProviderIssues 
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" 
                      : "bg-green-500/20 text-green-700 dark:text-green-400"
                  )}
                >
                  <span 
                    className={cn(
                      "h-1.5 w-1.5 rounded-full mr-1 animate-pulse",
                      hasProviderIssues ? "bg-amber-500" : "bg-green-500"
                    )} 
                  />
                  {hasProviderIssues ? "Fallback Mode" : "Online"}
                </Badge>
                <Link 
                  href="/ai-agents/diagnostics" 
                  className={cn(
                    "text-[10px] hover:text-primary transition-colors flex items-center gap-1",
                    hasProviderIssues ? "text-amber-600 font-semibold" : "text-muted-foreground"
                  )}
                >
                  <Activity className="h-3 w-3" />
                  System Status
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href="/">← Dashboard</Link>
            </Button>
            {conversationStarted && (
              <Button variant="outline" size="sm" onClick={clearChat}>
                Clear
              </Button>
            )}
          </div>
        </div>
        
        {/* Provider Status Alert */}
        {hasProviderIssues && (
          <div className="mx-auto max-w-4xl px-4 pb-3 sm:px-6 lg:px-8">
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs">
                <span className="font-semibold">AI Provider Issues Detected:</span> Primary providers unavailable. Using fallback provider.{" "}
                <Link 
                  href="/ai-agents/diagnostics" 
                  className="underline underline-offset-2 hover:text-primary font-medium"
                >
                  View detailed diagnostics →
                </Link>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <ChatArea
          messages={messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))}
          isLoading={isTyping}
          agentName="Fast Chat Agent"
        />

        {/* Quick Actions overlay */}
        {!isTyping && !conversationStarted && (
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="max-w-md w-full p-6 rounded-2xl bg-card/50 backdrop-blur-xl border border-border/50 shadow-2xl pointer-events-auto">
              <p className="mb-4 text-sm font-medium text-center">
                Select a quick action or start typing:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="justify-start text-xs h-auto py-2.5 px-3"
                  onClick={() => handleQuickAction("What are some business ideas I could start?")}
                >
                  💡 Business Ideas
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-xs h-auto py-2.5 px-3"
                  onClick={() => handleQuickAction("Help me write a professional email")}
                >
                  📧 Write Email
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-xs h-auto py-2.5 px-3"
                  onClick={() => handleQuickAction("Explain blockchain technology simply")}
                >
                  🔍 Explain Tech
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-xs h-auto py-2.5 px-3"
                  onClick={() => handleQuickAction("Give me productivity tips")}
                >
                  🚀 Productivity Tips
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="border-t bg-background/50 backdrop-blur-xl pt-2">
          <EnhancedChatInput
            onSend={(val) => handleSend(val)}
            isLoading={isTyping}
            models={[
              { id: "deepseek/deepseek-chat:free", name: "DeepSeek Chat (Free)", provider: "OpenRouter", isNew: true, priority: 1 },
              { id: "z-ai/glm-4.5-air", name: "GLM-4.5-Air", provider: "OpenRouter", isNew: true },
              { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", provider: "OpenRouter" },
              { id: "mistral:7b", name: "Mistral 7B (Local)", provider: "Ollama" },
            ]}
            selectedModelId={selectedModelId}
            onModelChange={(id) => setSelectedModelId(id)}
          />
        </div>
      </main>
    </div>
  );
}
