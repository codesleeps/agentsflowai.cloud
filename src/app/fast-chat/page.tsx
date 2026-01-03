"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EnhancedChatInput } from "@/components/chat/EnhancedChatInput";
import { cn } from "@/client-lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function FastChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your Fast Chat assistant powered by local Ollama. I can help you with general questions, brainstorming, and quick tasks. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
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
          agentId: "fast-chat-agent",
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
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Connection error. Please try again.");
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
    <div className="flex min-h-screen bg-premium-chat font-sans">
      {/* Header */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Fast Chat</h1>
              <p className="text-xs text-muted-foreground">
                Local AI Assistant (No Login Required)
              </p>
            </div>
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="mr-1 h-3 w-3" />
              Ollama
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/", "_self")}
            >
              ← Back to Home
            </Button>
            {conversationStarted && (
              <Button variant="outline" size="sm" onClick={clearChat}>
                Clear Chat
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="container mx-auto max-w-4xl flex-1 pb-24 pt-20">
        <div className="flex h-full flex-col">
          {/* Chat Messages */}
          <ScrollArea className="flex-1 px-4 py-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 shadow-lg transition-all",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground shadow-primary/20 rounded-tr-none"
                        : "bg-card/70 backdrop-blur-md border border-border/50 shadow-black/5 rounded-tl-none"
                    )}
                  >
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed italic last:not-italic">{message.content}</p>
                    <p className={cn(
                      "text-[10px] mt-2 font-medium opacity-40 uppercase tracking-tight",
                      message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          {!isTyping && conversationStarted && (
            <div className="border-t bg-background px-4 py-4">
              <p className="mb-2 text-xs text-muted-foreground">
                Quick Actions:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleQuickAction(
                      "What are some business ideas I could start?",
                    )
                  }
                >
                  Business Ideas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleQuickAction("Help me write a professional email")
                  }
                >
                  Write Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleQuickAction("Explain blockchain technology simply")
                  }
                >
                  Explain Tech
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction("Give me productivity tips")}
                >
                  Productivity Tips
                </Button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="fixed bottom-0 left-0 right-0 border-t bg-background/50 backdrop-blur-xl">
            <EnhancedChatInput
              onSend={(val) => handleSend(val)}
              isLoading={isTyping}
              models={[
                { id: "ollama", name: "Ollama (Local)", provider: "Local", priority: 1 },
                { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "Google", isNew: true },
              ]}
              selectedModelId="ollama"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
