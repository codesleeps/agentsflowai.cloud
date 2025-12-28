"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
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
          message: input.trim(),
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
    setInput(action);
    // Auto-submit for quick actions
    setTimeout(() => {
      const form = document.querySelector("form");
      form?.dispatchEvent(
        new Event("submit", { cancelable: true, bubbles: true }),
      );
    }, 100);
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
    <div className="flex min-h-screen bg-gradient-to-br from-background to-muted">
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
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border bg-card text-card-foreground"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`mt-1 text-xs ${
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
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
          <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-md">
            <div className="container mx-auto max-w-4xl px-4 py-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isTyping}
                  className="flex-1"
                />
                <Button type="submit" disabled={!input.trim() || isTyping}>
                  {isTyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Powered by local Ollama model • No data stored • Free to use
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
