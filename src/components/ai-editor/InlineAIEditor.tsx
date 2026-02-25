"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Sparkles,
  Wand2,
  Languages,
  List,
  AlignLeft,
  Smile,
  RotateCcw,
  Check,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface InlineAIEditorProps {
  text: string;
  onChange: (text: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

type AIAction =
  | "improve"
  | "summarize"
  | "expand"
  | "shorten"
  | "translate"
  | "tone-professional"
  | "tone-casual"
  | "tone-friendly"
  | "fix-grammar"
  | "bullet-points"
  | "paragraph";

interface ActionOption {
  id: AIAction;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const AI_ACTIONS: ActionOption[] = [
  {
    id: "improve",
    label: "Improve Writing",
    icon: <Wand2 className="h-4 w-4" />,
    description: "Enhance clarity and style",
  },
  {
    id: "fix-grammar",
    label: "Fix Grammar",
    icon: <Check className="h-4 w-4" />,
    description: "Correct spelling and grammar",
  },
  {
    id: "summarize",
    label: "Summarize",
    icon: <List className="h-4 w-4" />,
    description: "Create a brief summary",
  },
  {
    id: "expand",
    label: "Expand",
    icon: <AlignLeft className="h-4 w-4" />,
    description: "Add more detail",
  },
  {
    id: "shorten",
    label: "Make Shorter",
    icon: <AlignLeft className="h-4 w-4" />,
    description: "Reduce word count",
  },
  {
    id: "bullet-points",
    label: "To Bullet Points",
    icon: <List className="h-4 w-4" />,
    description: "Convert to list format",
  },
  {
    id: "paragraph",
    label: "To Paragraph",
    icon: <AlignLeft className="h-4 w-4" />,
    description: "Convert to paragraph",
  },
  {
    id: "tone-professional",
    label: "Professional Tone",
    icon: <Sparkles className="h-4 w-4" />,
    description: "More formal and professional",
  },
  {
    id: "tone-casual",
    label: "Casual Tone",
    icon: <Smile className="h-4 w-4" />,
    description: "More relaxed and casual",
  },
  {
    id: "tone-friendly",
    label: "Friendly Tone",
    icon: <Smile className="h-4 w-4" />,
    description: "Warm and approachable",
  },
  {
    id: "translate",
    label: "Translate",
    icon: <Languages className="h-4 w-4" />,
    description: "Translate to another language",
  },
];

export function InlineAIEditor({
  text,
  onChange,
  className = "",
  placeholder = "Start typing or select text to edit with AI...",
  disabled = false,
}: InlineAIEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [currentAction, setCurrentAction] = useState<AIAction | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Track text selection
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = text.substring(start, end);

    if (selected.length > 0) {
      setSelectedText(selected);
      setSelectionRange({ start, end });
    } else {
      setSelectedText("");
      setSelectionRange(null);
    }
  }, [text]);

  // Handle AI action
  const handleAIAction = async (action: AIAction) => {
    const textToProcess = selectedText || text;
    if (!textToProcess.trim()) {
      toast.error("Please enter some text first");
      return;
    }

    setIsProcessing(true);
    setCurrentAction(action);
    setPopoverOpen(false);

    try {
      const response = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToProcess,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process text");
      }

      const data = await response.json();
      setPreviewText(data.result);
      setShowPreview(true);
    } catch (error) {
      toast.error("Failed to process text. Please try again.");
      console.error("AI edit error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply the AI-generated text
  const applyChanges = () => {
    if (!selectionRange) {
      onChange(previewText);
    } else {
      const newText =
        text.substring(0, selectionRange.start) +
        previewText +
        text.substring(selectionRange.end);
      onChange(newText);
    }
    setShowPreview(false);
    setPreviewText("");
    setCurrentAction(null);
    setSelectedText("");
    setSelectionRange(null);
    toast.success("Changes applied!");
  };

  // Cancel the preview
  const cancelChanges = () => {
    setShowPreview(false);
    setPreviewText("");
    setCurrentAction(null);
  };

  // Regenerate
  const regenerate = () => {
    if (currentAction) {
      handleAIAction(currentAction);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          placeholder={placeholder}
          disabled={disabled || isProcessing}
          className="w-full min-h-[200px] p-4 rounded-lg border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />

        {/* AI Toolbar */}
        {selectedText && !showPreview && (
          <div className="absolute bottom-4 right-4">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  className="shadow-lg gap-2"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  AI Edit
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-1">
                  {AI_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAIAction(action.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors"
                    >
                      <span className="text-muted-foreground">{action.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="mt-4 p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">AI Suggestion</span>
              {currentAction && (
                <span className="text-xs text-muted-foreground">
                  (
                  {AI_ACTIONS.find((a) => a.id === currentAction)?.label})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={regenerate}
                disabled={isProcessing}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelChanges}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-background rounded-md p-3 mb-3 border">
            {isProcessing ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{previewText}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={cancelChanges}>
              Cancel
            </Button>
            <Button size="sm" onClick={applyChanges} disabled={isProcessing}>
              <Check className="h-4 w-4 mr-1" />
              Apply Changes
            </Button>
          </div>
        </div>
      )}

      {/* Character count */}
      <div className="mt-2 text-xs text-muted-foreground text-right">
        {text.length} characters
        {selectedText && ` • ${selectedText.length} selected`}
      </div>
    </div>
  );
}

// Simpler version for inline use
interface AIEditButtonProps {
  selectedText: string;
  onApply: (newText: string) => void;
}

export function AIEditButton({ selectedText, onApply }: AIEditButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [open, setOpen] = useState(false);

  const handleAction = async (action: AIAction) => {
    setIsProcessing(true);
    setOpen(false);

    try {
      const response = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectedText,
          action,
        }),
      });

      if (!response.ok) throw new Error("Failed to process");

      const data = await response.json();
      onApply(data.result);
      toast.success("Text updated!");
    } catch (error) {
      toast.error("Failed to process text");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedText) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          AI Edit
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <div className="space-y-1">
          {AI_ACTIONS.slice(0, 6).map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors"
            >
              <span className="text-muted-foreground">{action.icon}</span>
              <span className="text-sm">{action.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
