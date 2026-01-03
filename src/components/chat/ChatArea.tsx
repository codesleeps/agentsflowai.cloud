"use client";

import { useRef, useEffect } from "react";
import { Bot, User, Clock, Zap, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/client-lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    model?: string;
    tokensUsed?: number;
    responseTime?: number;
    agentId?: string;
}

interface ChatAreaProps {
    messages: Message[];
    isLoading?: boolean;
    agentIcon?: React.ReactNode;
    agentName?: string;
    className?: string;
    onScrollToBottom?: () => void;
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
        <ScrollArea className={cn("flex-1 p-4", className)}>
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
                                "group relative max-w-[85%] rounded-2xl px-5 py-3.5 shadow-2xl transition-all hover:shadow-primary/5",
                                message.role === "user"
                                    ? "bg-primary text-primary-foreground shadow-primary/20 rounded-tr-none border border-primary-foreground/10"
                                    : "bg-white/5 backdrop-blur-2xl border border-white/10 shadow-black/20 rounded-tl-none"
                            )}
                        >
                            {agentName && message.role === "assistant" && (
                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary/70">
                                    {agentName}
                                </div>
                            )}

                            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>

                            <div className={cn(
                                "mt-2 flex flex-wrap items-center gap-3 text-[10px] font-medium opacity-40 uppercase tracking-tight",
                                message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                                <span>
                                    {new Date(message.timestamp).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>

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
                        <div className="rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-black/20 rounded-tl-none p-4">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span className="text-xs font-semibold text-primary/70 animate-pulse uppercase tracking-widest">Thinking</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
    );
}
