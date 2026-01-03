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
import { EnhancedChatInput } from "@/components/chat/EnhancedChatInput";
import { ChatArea } from "@/components/chat/ChatArea";
import { cn } from "@/client-lib/utils";
import ReactMarkdown from "react-markdown";
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

  const handleSend = async (overrideInput?: string) => {
    const messageContent = overrideInput || input;
    if (!messageContent.trim() || !selectedAgent || isLoading) return;

    const userMessage: PlaygroundMessage = {
      role: "user",
      content: messageContent.trim(),
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
        <Card className="lg:col-span-1 bg-white/5 border-white/10 shadow-none">
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
                    className={`w-full rounded-lg border p-4 text-left transition-all ${selectedAgent?.id === agent.id
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
        <Card className="flex flex-col lg:col-span-3 bg-transparent border-white/10 shadow-none">
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
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary/70">
                      {currentModel.model}
                    </Badge>
                  )}
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
              <ChatArea
                messages={messages.map(m => ({
                  ...m,
                  timestamp: new Date(m.timestamp)
                }))}
                isLoading={isLoading}
                agentIcon={selectedAgent.icon}
                agentName={selectedAgent.name}
              />

              <div className="border-t bg-background/50 backdrop-blur-sm">
                <EnhancedChatInput
                  onSend={(val) => handleSend(val)}
                  isLoading={isLoading}
                  placeholder={`Test ${selectedAgent.name} with any prompt...`}
                  models={selectedAgent.supportedProviders?.map((p: any) => ({
                    id: p.provider,
                    name: `${p.provider} (${p.model})`,
                    provider: p.provider,
                    priority: p.priority,
                    model: p.model
                  })) || []}
                  selectedModelId={currentModel?.provider}
                  onModelChange={(provider, model) => {
                    if (model) {
                      handleModelChange(provider, model);
                    } else {
                      // Find the model for this provider in agent config
                      const m = selectedAgent.supportedProviders?.find((p: any) => p.provider === provider)?.model;
                      handleModelChange(provider, m || selectedAgent.model);
                    }
                  }}
                />
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
