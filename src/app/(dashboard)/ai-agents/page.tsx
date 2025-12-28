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

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || isLoading) return;

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
        toast.info(response.note);
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

  const renderMessageContent = (content: string) => {
    // Simple markdown-like rendering for code blocks
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

      // Render bold text
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
          {/* Ollama Status */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
                ollamaStatus?.status === "connected"
                  ? "bg-green-500/20 text-green-700 dark:text-green-400"
                  : "bg-red-500/20 text-red-700 dark:text-red-400"
              }`}
            >
              {ollamaStatus?.status === "connected" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>Ollama: {ollamaStatus?.status || "checking..."}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refreshStatus()}>
              <RefreshCw className="h-4 w-4" />
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Agents
            </CardTitle>
            <CardDescription>Select a specialized agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agents?.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent)}
                  className={`w-full rounded-lg border p-4 text-left transition-all ${
                    selectedAgent?.id === agent.id
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
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="flex flex-col lg:col-span-2">
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
                <ModelSelector
                  agent={selectedAgent}
                  onModelChange={handleModelChange}
                />
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
                        <div
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${agentColors[selectedAgent.id]}`}
                        >
                          {agentIcons[selectedAgent.id]}
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
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs opacity-60">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {message.model && (
                            <Badge
                              variant="outline"
                              className="text-xs opacity-60"
                            >
                              {message.model}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start gap-3">
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${agentColors[selectedAgent.id]}`}
                      >
                        {agentIcons[selectedAgent.id]}
                      </div>
                      <div className="rounded-lg bg-muted p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={`Ask ${selectedAgent.name} anything...`}
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
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
