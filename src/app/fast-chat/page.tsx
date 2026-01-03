"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
              <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                Online
              </Badge>
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

        {/* Input Area */}
        <div className="border-t bg-background/50 backdrop-blur-xl">
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
      </main>
    </div>
  );
}
