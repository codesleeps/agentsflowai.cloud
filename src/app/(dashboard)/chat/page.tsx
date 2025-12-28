"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateText } from "@/client-lib/built-in-integrations/ai";
import { useServices } from "@/client-lib/api-client";
import type { ChatMessage } from "@/shared/models/types";

const SYSTEM_PROMPT = `You are an AI assistant for AgentsFlowAI, an AI-powered business automation platform. You help potential customers:

1. Understand our services (Starter $999, Growth $2499, Enterprise $4999)
2. Get recommendations based on their business needs
3. Answer questions about digital marketing, automation, and AI solutions
4. Qualify leads by understanding their budget, timeline, and goals
5. Schedule consultations and demos

Be helpful, professional, and concise. When appropriate, recommend specific service packages based on the customer's needs.

Services:
- Starter Package ($999): Perfect for small businesses - includes social media setup, basic SEO audit, 1 month support, email template
- Growth Package ($2499): For scaling businesses - includes full SEO optimization, PPC campaign management, content strategy, 3 months support, monthly reporting
- Enterprise Package ($4999): Complete digital transformation - includes dedicated account manager, custom integrations, advanced analytics, 24/7 support, quarterly strategy reviews, multi-channel campaigns

Always try to understand the customer's:
- Business type and size
- Current challenges
- Budget range
- Timeline for implementation
- Goals they want to achieve`;

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! 👋 I'm your AI assistant at AgentsFlowAI. I can help you find the perfect automation solution for your business.\n\nI can help you with:\n• Understanding our service packages\n• Getting personalized recommendations\n• Answering questions about digital marketing & AI automation\n• Scheduling a consultation\n\nWhat brings you here today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: services } = useServices();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`)
        .join("\n");

      const prompt = `${SYSTEM_PROMPT}

Previous conversation:
${conversationHistory}

Customer: ${userMessage.content}

Provide a helpful, concise response as the AI assistant:`;

      const response = await generateText(prompt);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
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
        content: "Hello! 👋 I'm your AI assistant at AgentsFlowAI. I can help you find the perfect automation solution for your business.\n\nI can help you with:\n• Understanding our service packages\n• Getting personalized recommendations\n• Answering questions about digital marketing & AI automation\n• Scheduling a consultation\n\nWhat brings you here today?",
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

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    <p className="text-xs mt-2 opacity-60">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {messages.length <= 2 && (
            <div className="p-4 border-t bg-muted/30">
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

          <div className="p-4 border-t bg-background">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
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
