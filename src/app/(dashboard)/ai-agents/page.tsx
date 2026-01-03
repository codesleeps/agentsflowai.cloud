"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Code,
  BarChart3,
  PenTool,
  Megaphone,
  Share2,
  Search,
  Send,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Cpu,
  Sparkles,
  Copy,
  Check,
  User,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  useOllamaStatus,
  useAIAgents,
  generateAgentResponse,
} from "@/client-lib/ai-agents-client";
import { toast } from "sonner";
import type { AIAgent, AIProvider } from "@/shared/models/ai-agents";
import { ModelSelector } from "@/components/ModelSelector";
import { EnhancedChatInput } from "@/components/chat/EnhancedChatInput";
import { cn } from "@/client-lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agentId?: string;
  model?: string;
}

const agentIcons: Record<string, React.ReactNode> = {
  "web-dev-agent": <Code className="h-5 w-5" />,
  "analytics-agent": <BarChart3 className="h-5 w-5" />,
  "content-agent": <PenTool className="h-5 w-5" />,
  "marketing-agent": <Megaphone className="h-5 w-5" />,
  "social-media-agent": <Share2 className="h-5 w-5" />,
  "seo-agent": <Search className="h-5 w-5" />,
};

const agentColors: Record<string, string> = {
  "web-dev-agent":
    "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  "analytics-agent":
    "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  "content-agent":
    "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  "marketing-agent":
    "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  "social-media-agent":
    "bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/30",
  "seo-agent":
    "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
};

export default function AIAgentsPage() {
  const { data: ollamaStatus, mutate: refreshStatus } = useOllamaStatus();
  const { data: agents } = useAIAgents();
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<{
    provider: AIProvider;
    model: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectAgent = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setCurrentModel({
      provider: agent.defaultProvider as AIProvider,
      model: agent.model,
    });
    setMessages([
      {
        role: "assistant",
        content: `Hello! I'm the **${agent.name}** ${agent.icon}. ${agent.description}.\n\nHere's what I can help you with:\n${agent.capabilities.map((c) => `• ${c}`).join("\n")}\n\nHow can I assist you today?`,
        timestamp: new Date(),
        agentId: agent.id,
      },
    ]);
  };

  const handleModelChange = (provider: AIProvider, model: string) => {
    setCurrentModel({ provider, model });
    toast.info(`Switched to ${provider} model: ${model}`);
  };

  const handleSend = async (overrideInput?: string) => {
    const messageContent = overrideInput || input;
    if (!messageContent.trim() || !selectedAgent || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: messageContent.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10) // Keep last 10 messages for context
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await generateAgentResponse(
        selectedAgent.id,
        userMessage.content,
        conversationHistory,
      );

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        agentId: selectedAgent.id,
        model: response.model,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.note) {
        // Only show if it's not the generic fallback note we already handled in the UI
        if (!response.note.includes("offline fallback mode")) {
          toast.info(response.note);
        }
      }
    } catch (error) {
      console.error("Error generating response:", error);
      toast.error("Failed to generate response. Please try again.");

      const errorMessage: ChatMessage = {
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


  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Agents Hub
          </h1>
          <p className="mt-1 text-muted-foreground">
            Specialized AI agents with multi-provider support
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Provider Status Indicators */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Providers:</span>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${ollamaStatus?.status === "connected"
                  ? "bg-green-500/20 text-green-700 dark:text-green-400"
                  : "bg-red-500/20 text-red-700 dark:text-red-400"
                  }`}
              >
                {ollamaStatus?.status === "connected" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                <span>Ollama</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-700 dark:text-gray-400">
                <XCircle className="h-3 w-3" />
                <span>Gemini</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-700 dark:text-gray-400">
                <XCircle className="h-3 w-3" />
                <span>OpenRouter</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-700 dark:text-gray-400">
                <XCircle className="h-3 w-3" />
                <span>Anthropic</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-700 dark:text-gray-400">
                <XCircle className="h-3 w-3" />
                <span>OpenAI</span>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ai-agents/diagnostics">
                Test All Providers
              </Link>
            </Button>
          </div>
          <Button variant="outline" asChild>
            <Link href="/">Dashboard</Link>
          </Button>
        </div>
      </div>

      {/* Quick Links to Specialized Agents */}
      <Card>
        <CardContent className="flex flex-wrap gap-2 py-3">
          <span className="mr-2 text-xs font-medium text-muted-foreground">
            Jump to specialized agents:
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ai-agents/seo">
              <Search className="mr-1 h-3 w-3" /> SEO Agent
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ai-agents/content">
              <PenTool className="mr-1 h-3 w-3" /> Content Agent
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ai-agents/social">
              <Share2 className="mr-1 h-3 w-3" /> Social Media Agent
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Available Models */}
      {ollamaStatus?.status === "connected" &&
        ollamaStatus.models &&
        ollamaStatus.models.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Available Models:
                </span>
                {ollamaStatus.models.map((model) => (
                  <Badge key={model.name} variant="secondary">
                    {model.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Main Content */}
      <div className="grid flex-1 gap-6 lg:grid-cols-3">
        {/* Agent Selection */}
        <Card className="lg:col-span-1">
          <Tabs defaultValue="browse" className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  AI Agents
                </CardTitle>
              </div>
              <TabsList className="grid w-full grid-cols-2 mt-2">
                <TabsTrigger value="browse">Browse Agents</TabsTrigger>
                <TabsTrigger value="my-agents">My Agents</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="browse" className="mt-0">
                <div className="space-y-3">
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search agents..."
                      className="pl-9"
                    />
                  </div>
                  {agents?.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent)}
                      className={`w-full rounded-lg border p-4 text-left transition-all ${selectedAgent?.id === agent.id
                        ? `${agentColors[agent.id]} border-2`
                        : "hover:bg-muted/50"
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 ${agentColors[agent.id]}`}>
                          {agentIcons[agent.id]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="flex items-center gap-2 font-medium">
                            {agent.name}
                            <span>{agent.icon}</span>
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="my-agents" className="mt-0">
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Bot className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No active agents</p>
                  <p className="text-xs">Agents you configure will appear here</p>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Chat Interface */}
        <Card className="flex flex-col lg:col-span-2 bg-glass">
          <CardHeader className="border-b">
            {selectedAgent ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg p-2 ${agentColors[selectedAgent.id]}`}
                  >
                    {agentIcons[selectedAgent.id]}
                  </div>
                  <div>
                    <CardTitle>{selectedAgent.name}</CardTitle>
                    <CardDescription>
                      {selectedAgent.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="animate-fadeIn">
                  <ModelSelector
                    agent={selectedAgent}
                    onModelChange={handleModelChange}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Select an Agent</CardTitle>
                  <CardDescription>
                    Choose a specialized AI agent to start
                  </CardDescription>
                </div>
              </div>
            )}
          </CardHeader>

          {selectedAgent ? (
            <>
              <ScrollArea className="max-h-[500px] flex-1 p-4 bg-premium-chat/30">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div
                          className={cn(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                            agentColors[selectedAgent.id] || "bg-primary/10"
                          )}
                        >
                          {agentIcons[selectedAgent.id] || <Bot className="h-4 w-4" />}
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3 shadow-lg transition-all",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground shadow-primary/20 rounded-tr-none"
                            : "bg-card/70 backdrop-blur-md border border-border/50 shadow-black/5 rounded-tl-none"
                        )}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        <div className={cn(
                          "mt-2 flex items-center gap-3 text-[10px] font-medium opacity-40 uppercase tracking-tight",
                          message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          <span>
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {message.model && (
                            <Badge variant="outline" className="h-[18px] px-1.5 text-[9px] border-muted-foreground/20 font-bold">
                              {message.model}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {message.role === "user" && (
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                          agentColors[selectedAgent.id] || "bg-primary/10"
                        )}
                      >
                        {agentIcons[selectedAgent.id] || <Bot className="h-4 w-4" />}
                      </div>
                      <div className="rounded-lg bg-card/70 backdrop-blur-md p-4 border border-border/50">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t bg-background/50 backdrop-blur-sm">
                <EnhancedChatInput
                  onSend={(val) => handleSend(val)}
                  isLoading={isLoading}
                  placeholder={`Ask ${selectedAgent.name} anything...`}
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
                      handleModelChange(provider as AIProvider, model);
                    } else {
                      const m = selectedAgent.supportedProviders?.find((p: any) => p.provider === provider)?.model;
                      handleModelChange(provider as AIProvider, m || selectedAgent.model);
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <CardContent className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Bot className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                <p className="text-lg font-medium">No agent selected</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select an AI agent from the left panel to start chatting
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Setup Instructions */}
      {ollamaStatus?.status !== "connected" && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <Cpu className="h-5 w-5" />
              Setup Ollama on Your VPS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <p>
                To enable full AI capabilities, install Ollama on your Hostinger
                VPS:
              </p>

              <div className="space-y-2 rounded-lg bg-muted p-4 font-mono text-xs">
                <p className="text-muted-foreground">
                  # SSH into your VPS and run:
                </p>
                <p>curl -fsSL https://ollama.com/install.sh | sh</p>
                <p className="mt-4 text-muted-foreground">
                  # Start Ollama service:
                </p>
                <p>ollama serve</p>
                <p className="mt-4 text-muted-foreground">
                  # Pull recommended models (16GB RAM):
                </p>
                <p>ollama pull mistral</p>
                <p>ollama pull codellama:7b</p>
                <p>ollama pull llama2:7b</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">Mistral 7B</p>
                  <p className="text-xs text-muted-foreground">
                    Best for general tasks
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">CodeLlama 7B</p>
                  <p className="text-xs text-muted-foreground">
                    Optimized for code
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">Llama2 7B</p>
                  <p className="text-xs text-muted-foreground">
                    Great for content
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">Neural Chat</p>
                  <p className="text-xs text-muted-foreground">
                    Conversational AI
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground">
                With 16GB RAM, you can comfortably run 7B parameter models. For
                best performance, we recommend Mistral 7B as your primary model.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
