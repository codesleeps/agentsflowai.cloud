/**
 * React Hook for AI Streaming
 * Provides a simple interface for consuming AI streaming responses
 */

import { useState, useCallback, useRef } from "react";

interface StreamMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseAIStreamOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: string) => void;
}

interface UseAIStreamReturn {
  messages: StreamMessage[];
  isStreaming: boolean;
  streamResponse: (prompt: string, options: StreamRequestOptions) => Promise<void>;
  stopStreaming: () => void;
  clearMessages: () => void;
}

interface StreamRequestOptions {
  provider: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

export function useAIStream(options: UseAIStreamOptions = {}): UseAIStreamReturn {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamResponse = useCallback(
    async (prompt: string, requestOptions: StreamRequestOptions) => {
      // Add user message
      const userMessage: StreamMessage = { role: "user", content: prompt };
      setMessages((prev) => [...prev, userMessage]);

      setIsStreaming(true);
      let fullResponse = "";

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/ai/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            ...requestOptions,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Stream request failed");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        // Add placeholder for assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "token" && parsed.content) {
                  fullResponse += parsed.content;
                  options.onToken?.(parsed.content);

                  // Update the last message (assistant's response)
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.role === "assistant") {
                      lastMessage.content = fullResponse;
                    }
                    return newMessages;
                  });
                } else if (parsed.type === "error") {
                  throw new Error(parsed.error || "Stream error");
                } else if (parsed.type === "done") {
                  options.onComplete?.(fullResponse);
                  setIsStreaming(false);
                  return;
                }
              } catch (parseError) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        options.onComplete?.(fullResponse);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // User cancelled - this is expected
          options.onComplete?.(fullResponse);
        } else {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          options.onError?.(errorMessage);
          
          // Update the last message with error
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.role === "assistant") {
              lastMessage.content = `Error: ${errorMessage}`;
            }
            return newMessages;
          });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [messages, options]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    streamResponse,
    stopStreaming,
    clearMessages,
  };
}
