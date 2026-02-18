"use client";

import { useRef, useEffect, useState } from "react";
import { Bot, User, Clock, Zap, Loader2, AlertTriangle, ChevronDown, ChevronUp, Activity, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/client-lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    model?: string;
    tokensUsed?: number;
    responseTime?: number;
    agentId?: string;
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

interface ChatAreaProps {
    messages: Message[];
    isLoading?: boolean;
    agentIcon?: React.ReactNode;
    agentName?: string;
    className?: string;
    onScrollToBottom?: () => void;
}

function ErrorDetails({ errorLog }: { errorLog: Array<{ provider: string; model: string; error: string; duration: number }> }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <CollapsibleTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs hover:bg-destructive/10 text-destructive hover:text-destructive"
                    >
                        <span className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            View Error Details ({errorLog.length})
                            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </span>
                    </Button>
                </CollapsibleTrigger>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 px-2 text-xs bg-primary/5 border-primary/30 hover:bg-primary/10" 
                    asChild
                >
                    <Link href="/ai-agents/diagnostics" className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        Check System Status
                    </Link>
                </Button>
            </div>
            
            <CollapsibleContent className="mt-2">
                <Alert className="bg-muted/50 border-muted">
                    <AlertDescription>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold mb-2 text-destructive flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Provider Failures ({errorLog.length} attempt{errorLog.length !== 1 ? 's' : ''}):
                            </p>
                            {errorLog.map((err, idx) => (
                                <div 
                                    key={idx} 
                                    className="text-xs p-2 rounded bg-background/50 border space-y-1"
                                >
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge 
                                            variant="outline" 
                                            className={cn(
                                                "h-[16px] px-1.5 text-[9px]",
                                                err.provider === "ollama" && "bg-green-500/10 text-green-600 border-green-500/30",
                                                err.provider === "google" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                                                err.provider === "openrouter" && "bg-purple-500/10 text-purple-600 border-purple-500/30",
                                                err.provider === "openai" && "bg-orange-500/10 text-orange-600 border-orange-500/30"
                                            )}
                                        >
                                            {err.provider}
                                        </Badge>
                                        <Badge variant="secondary" className="h-[16px] px-1.5 text-[9px]">
                                            {err.model}
                                        </Badge>
                                        <span className="text-muted-foreground text-[10px]">
                                            {err.duration}ms
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground text-[11px]">
                                        {err.error}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </AlertDescription>
                </Alert>
            </CollapsibleContent>
        </Collapsible>
    );
}

function CopyButton({ content }: { content: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 text-muted-foreground hover:text-foreground"
            title="Copy response"
        >
            {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
                <Copy className="h-3.5 w-3.5" />
            )}
        </Button>
    );
}

export function ChatArea({
    messages,
    isLoading,
    agentIcon,
    agentName,
    className,
}: ChatAreaProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    return (
        <ScrollArea className={cn("flex-1 p-6", className)}>
            <div className="space-y-6 max-w-4xl mx-auto pb-10">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                            message.role === "user" ? "justify-end" : "justify-start"
                        )}
                    >
                        {message.role === "assistant" && (
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/30 shadow-sm backdrop-blur-md">
                                {agentIcon || <Bot className="h-5 w-5 text-primary" />}
                            </div>
                        )}

                        <div
                            className={cn(
                                "group relative max-w-[85%] rounded-3xl px-6 py-4 shadow-lg transition-all hover:shadow-primary/5",
                                message.role === "user"
                                    ? "bg-primary text-primary-foreground shadow-primary/10 rounded-tr-md"
                                    : "bg-white/10 backdrop-blur-2xl shadow-black/10 rounded-tl-md border border-white/10"
                            )}
                        >
                            {message.role === "assistant" && (
                                <div className="absolute top-3 right-3">
                                    <CopyButton content={message.content} />
                                </div>
                            )}

                            {agentName && message.role === "assistant" && (
                                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary/80">
                                    {agentName}
                                </div>
                            )}

                            <div className={cn(
                                "prose prose-sm max-w-none leading-relaxed text-[15px]",
                                message.role === "user"
                                    ? "prose-invert"
                                    : "dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-black/40 prose-pre:backdrop-blur-md prose-pre:border prose-pre:border-white/10 prose-pre:shadow-inner prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-ol:text-white prose-ul:text-white prose-li:text-white prose-li:marker:text-white"
                            )}>
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>

                            <div className={cn(
                                "mt-3 flex flex-wrap items-center gap-3 text-[10px] font-medium opacity-40 uppercase tracking-tight",
                                message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                                <span>
                                    {new Date(message.timestamp).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>

                                {message.usedProvider && (
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "h-[18px] px-1.5 text-[9px] font-bold",
                                            message.usedProvider === "ollama" && "bg-green-500/10 text-green-600 border-green-500/30",
                                            message.usedProvider === "google" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                                            message.usedProvider === "openrouter" && "bg-purple-500/10 text-purple-600 border-purple-500/30",
                                            message.usedProvider === "openai" && "bg-orange-500/10 text-orange-600 border-orange-500/30"
                                        )}
                                    >
                                        {message.usedProvider}
                                    </Badge>
                                )}

                                {message.model && (
                                    <Badge variant="outline" className="h-[18px] px-1.5 text-[9px] border-muted-foreground/20 font-bold bg-background/50">
                                        {message.model}
                                    </Badge>
                                )}

                                {message.responseTime && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" />
                                        {message.responseTime}ms
                                    </span>
                                )}

                                {message.tokensUsed && (
                                    <span className="flex items-center gap-1">
                                        <Zap className="h-2.5 w-2.5" />
                                        {message.tokensUsed} tokens
                                    </span>
                                )}
                            </div>

                            {/* Fallback indicator and error details */}
                            {message.role === "assistant" && (message.fallbackUsed || message.errorLog) && (
                                <div className="mt-3 space-y-2.5">
                                    {message.fallbackUsed && (
                                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 h-5 px-2 text-[10px] font-bold">
                                                        FALLBACK PROVIDER USED
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-amber-700/80 dark:text-amber-600/80">
                                                    Primary AI provider(s) unavailable. Response generated using backup provider.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {message.note && (
                                        <p className="text-xs text-muted-foreground italic pl-2 border-l-2 border-muted">{message.note}</p>
                                    )}

                                    {message.errorLog && message.errorLog.length > 0 && (
                                        <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
                                            <ErrorDetails errorLog={message.errorLog} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {message.role === "user" && (
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary shadow-md border border-primary-foreground/20">
                                <User className="h-5 w-5 text-primary-foreground" />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start gap-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/30 shadow-sm backdrop-blur-md">
                            {agentIcon || <Bot className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="rounded-3xl bg-white/10 backdrop-blur-2xl shadow-black/10 rounded-tl-md px-6 py-4 border border-white/10">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span className="text-xs font-semibold text-primary/80 animate-pulse uppercase tracking-widest">Thinking</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
    );
}
