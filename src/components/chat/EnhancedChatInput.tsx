
"use client";

import { useState, useRef, useEffect } from "react";
import {
    Plus,
    ChevronDown,
    Mic,
    ArrowUp,
    Sparkles,
    Zap,
    Bot,
    BrainCircuit,
    Cpu,
    Globe
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/client-lib/utils";

export interface ModelOption {
    id: string;
    name: string;
    provider?: string;
    isNew?: boolean;
    model?: string;
    priority?: number;
}

export interface ModeOption {
    id: string;
    name: string;
    icon: React.ReactNode;
}

interface EnhancedChatInputProps {
    onSend: (message: string) => void;
    isLoading?: boolean;
    models?: ModelOption[];
    selectedModelId?: string;
    onModelChange?: (modelId: string, provider?: string) => void;
    modes?: ModeOption[];
    selectedModeId?: string;
    onModeChange?: (modeId: string) => void;
    placeholder?: string;
}

const DEFAULT_MODES: ModeOption[] = [
    { id: "fast", name: "Fast", icon: <Zap className="h-4 w-4 text-amber-500" /> },
    { id: "standard", name: "Standard", icon: <BrainCircuit className="h-4 w-4 text-blue-500" /> },
    { id: "pro", name: "Pro", icon: <Sparkles className="h-4 w-4 text-purple-500" /> },
];

export function EnhancedChatInput({
    onSend,
    isLoading,
    models = [],
    selectedModelId,
    onModelChange,
    modes = DEFAULT_MODES,
    selectedModeId,
    onModeChange,
    placeholder = "Type your message...",
}: EnhancedChatInputProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];
    const selectedMode = modes.find((m) => m.id === selectedModeId) || modes[0];

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleSend = () => {
        if (input.trim() && !isLoading) {
            onSend(input.trim());
            setInput("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="relative mx-auto w-full max-w-4xl px-4 py-4">
            <div
                className={cn(
                    "relative flex flex-col rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-3xl transition-all duration-300",
                    "focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/10",
                    isLoading && "opacity-80 shadow-none border-white/5"
                )}
            >
                {/* Input Area */}
                <div className="flex px-4 pt-4">
                    <Textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="min-h-[44px] w-full resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40 leading-relaxed"
                        disabled={isLoading}
                    />
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between p-2 pb-3">
                    <div className="flex items-center gap-1.5 ml-1">
                        {/* Plus Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-all active:scale-90"
                            disabled={isLoading}
                        >
                            <Plus className="h-5 w-5" />
                        </Button>

                        <div className="h-4 w-[1px] bg-muted-foreground/10 mx-1" />

                        {/* Mode Selector */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 gap-1.5 rounded-xl px-2.5 text-sm font-medium text-muted-foreground hover:bg-accent/40 hover:text-foreground data-[state=open]:bg-accent/40 transition-all active:scale-95"
                                    disabled={isLoading}
                                >
                                    {selectedMode?.icon}
                                    <span className="hidden sm:inline-block">{selectedMode?.name}</span>
                                    <ChevronDown className="h-3.5 w-3.5 opacity-40" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52 p-1.5 backdrop-blur-2xl bg-popover/90 border-muted-foreground/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/60 px-2 py-2">Select Mode</DropdownMenuLabel>
                                {modes.map((mode) => (
                                    <DropdownMenuItem
                                        key={mode.id}
                                        className={cn(
                                            "flex items-center gap-2.5 rounded-lg cursor-pointer transition-all px-2.5 py-2",
                                            selectedModeId === mode.id && "bg-accent/50 text-accent-foreground"
                                        )}
                                        onClick={() => onModeChange?.(mode.id)}
                                    >
                                        {mode.icon}
                                        <span className="font-medium text-sm">{mode.name}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Model Selector */}
                        {models.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 gap-1.5 rounded-xl bg-accent/30 px-3 text-sm font-semibold hover:bg-accent/50 hover:text-foreground data-[state=open]:bg-accent/50 transition-all active:scale-95"
                                        disabled={isLoading}
                                    >
                                        <span className="text-muted-foreground/60 font-normal hidden xs:inline">Model</span>
                                        <span className="truncate max-w-[120px]">{selectedModel?.name || "Select Model"}</span>
                                        <ChevronDown className="h-3.5 w-3.5 opacity-40" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[300px] p-1.5 backdrop-blur-2xl bg-popover/90 border-muted-foreground/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                    <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/60 px-2 py-2">Available Models</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-muted-foreground/10 mx-1" />
                                    <div className="max-h-[350px] overflow-y-auto pr-1">
                                        {models.map((model) => (
                                            <DropdownMenuItem
                                                key={model.id}
                                                className={cn(
                                                    "flex flex-col items-start gap-1 rounded-lg px-3 py-2.5 cursor-pointer transition-all mb-1",
                                                    selectedModelId === model.id ? "bg-accent/60" : "hover:bg-accent/30"
                                                )}
                                                onClick={() => onModelChange?.(model.id, model.provider)}
                                            >
                                                <div className="flex w-full items-center justify-between">
                                                    <span className="font-semibold text-sm">{model.name}</span>
                                                    <div className="flex gap-1">
                                                        {model.isNew && (
                                                            <Badge variant="secondary" className="h-[18px] px-1.5 text-[9px] bg-primary/10 text-primary border-none font-bold uppercase tracking-wider">New</Badge>
                                                        )}
                                                        {model.priority === 1 && (
                                                            <Badge variant="outline" className="h-[18px] px-1.5 text-[9px] border-primary/20 text-primary/60 font-medium">Primary</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                {model.provider && (
                                                    <span className="text-[10px] text-muted-foreground/50 font-medium tracking-tight flex items-center gap-1">
                                                        <Globe className="h-2.5 w-2.5" />
                                                        {model.provider}
                                                    </span>
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pr-1 ml-4 sm:ml-0">
                        {/* Mic Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-all active:scale-90"
                            disabled={isLoading}
                        >
                            <Mic className="h-5 w-5" />
                        </Button>

                        {/* Send Button */}
                        <Button
                            size="icon"
                            className={cn(
                                "h-9 w-9 rounded-full transition-all duration-300",
                                !input.trim() || isLoading
                                    ? "bg-white/5 text-muted-foreground/30 cursor-not-allowed"
                                    : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-105 active:scale-90"
                            )}
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                        >
                            {isLoading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                                <ArrowUp className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
            <p className="mt-3 text-center text-[10px] text-muted-foreground/30 font-medium tracking-wider uppercase">
                Intelligence by AgentsFlowAI • Premium Experience
            </p>
        </div>
    );
}
