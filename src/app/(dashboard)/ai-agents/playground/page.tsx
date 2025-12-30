"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Bot,
  ArrowLeft,
  Settings,
  MessageSquare,
  Clock,
  Zap,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserAIAgents } from "@/client-lib/user-ai-agents-client";
import { useAIAgents } from "@/client-lib/ai-agents-client";
import { generateAgentResponse } from "@/client-lib/ai-agents-client";
import { ModelSelector } from "@/components/ModelSelector";
import { toast } from "sonner";

interface PlaygroundMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agentId?: string;
  model?: string;
  tokensUsed?: number;
  responseTime?: number;
}

export default function AgentPlaygroundPage() {
  const { data: userAgents } = useUserAIAgents();
  const { data: systemAgents } = useAIAgents();
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<{
    provider: string;
    model: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const allAgents = [
    ...(userAgents || []).map((agent) => ({ ...agent, type: "user" })),
    ...(systemAgents || []).map((agent) => ({ ...agent, type: "system" })),
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectAgent = (agent: any) => {
    setSelectedAgent(agent);
    setCurrentModel({
      provider: agent.defaultProvider || agent.provider,
      model: agent.model,
    });
    setMessages([
      {
        role: "assistant",
        content: `Welcome to the Agent Playground! I'm **${agent.name}**. ${agent.description || ""}\n\nI'm ready to help you test and refine my capabilities. What would you like to try?`,
        timestamp: new Date(),
        agentId: agent.id,
      },
    ]);
  };

  const handleModelChange = (provider: string, model: string) => {
    setCurrentModel({ provider, model });
    toast.info(`Switched to ${provider} model: ${model}`);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || isLoading) return;

    const userMessage: PlaygroundMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const startTime = Date.now();

    try {
      const conversationHistory = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await generateAgentResponse(
        selectedAgent.id,
        userMessage.content,
        conversationHistory,
      );

      const responseTime = Date.now() - startTime;

      const assistantMessage: PlaygroundMessage = {
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        agentId: selectedAgent.id,
        model: response.model,
        tokensUsed: response.tokensUsed,
        responseTime,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.note) {
        toast.info(response.note);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      toast.error("Failed to generate response. Please try again.");

      const errorMessage: PlaygroundMessage = {
        role: "assistant",
        content:
          "I apologize, but I encountered an error. Please try again or check if the selected AI provider is available.",
        timestamp: new Date(),
        agentId: selectedAgent.id,
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeContent = part.slice(3, -3);
        const firstLineEnd = codeContent.indexOf("\n");
        const language =
          firstLineEnd > 0 ? codeContent.slice(0, firstLineEnd).trim() : "";
        const code =
          firstLineEnd > 0 ? codeContent.slice(firstLineEnd + 1) : codeContent;

        return (
          <div key={index} className="relative my-3">
            <div className="flex items-center justify-between rounded-t-lg border-b bg-muted/80 px-3 py-1">
              <span className="font-mono text-xs text-muted-foreground">
                {language || "code"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => handleCopyCode(code)}
              >
                {copiedCode === code ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-b-lg bg-muted/50 p-3">
              <code className="font-mono text-sm">{code}</code>
            </pre>
          </div>
        );
      }

      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={index}>
          {boldParts.map((boldPart, boldIndex) => {
            if (boldPart.startsWith("**") && boldPart.endsWith("**")) {
              return <strong key={boldIndex}>{boldPart.slice(2, -2)}</strong>;
            }
            return <span key={boldIndex}>{boldPart}</span>;
          })}
        </span>
      );
    });
  };

  const clearChat = () => {
    setMessages([]);
    if (selectedAgent) {
      setMessages([
        {
          role: "assistant",
          content: `Welcome back to the Agent Playground! I'm **${selectedAgent.name}**. What would you like to test next?`,
          timestamp: new Date(),
          agentId: selectedAgent.id,
        },
      ]);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/ai-agents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Play className="h-8 w-8 text-primary" />
              Agent Playground
            </h1>
            <p className="mt-1 text-muted-foreground">
              Test and refine your AI agents in an interactive environment
            </p>
          </div>
        </div>
        {selectedAgent && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={clearChat}>
              Clear Chat
            </Button>
          </div>
        )}
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-4">
        {/* Agent Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Select Agent
            </CardTitle>
            <CardDescription>Choose an agent to test</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {allAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent)}
                    className={`w-full rounded-lg border p-4 text-left transition-all ${
                      selectedAgent?.id === agent.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{agent.icon || "🤖"}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="flex items-center gap-2 font-medium">
                          {agent.name}
                          {agent.type === "user" && (
                            <Badge variant="secondary" className="text-xs">
                              Custom
                            </Badge>
                          )}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {agent.description}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{agent.usage_count || 0} uses</span>
                          <span>•</span>
                          <span>{agent.provider || "ollama"}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="flex flex-col lg:col-span-3">
          <CardHeader className="border-b">
            {selectedAgent ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{selectedAgent.icon || "🤖"}</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedAgent.name}
                      {selectedAgent.type === "user" && (
                        <Badge variant="secondary">Custom Agent</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {selectedAgent.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentModel && (
                    <Badge variant="outline">
                      {currentModel.provider} • {currentModel.model}
                    </Badge>
                  )}
                  <ModelSelector
                    agent={selectedAgent}
                    onModelChange={handleModelChange}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Select an Agent</CardTitle>
                  <CardDescription>
                    Choose an AI agent from the left panel to start testing
                  </CardDescription>
                </div>
              </div>
            )}
          </CardHeader>

          {selectedAgent ? (
            <>
              <ScrollArea className="max-h-[500px] flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-lg p-4 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">
                          {renderMessageContent(message.content)}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs opacity-60">
                          <span>
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {message.model && (
                            <Badge variant="outline" className="text-xs">
                              {message.model}
                            </Badge>
                          )}
                          {message.responseTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {message.responseTime}ms
                            </span>
                          )}
                          {message.tokensUsed && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {message.tokensUsed} tokens
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="rounded-lg bg-muted p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={`Test ${selectedAgent.name} with any prompt...`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    className="min-h-[60px] resize-none"
                    rows={2}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="h-auto"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (
            <CardContent className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Play className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                <p className="text-lg font-medium">Agent Playground</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select an AI agent to start testing and refining its
                  capabilities
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
