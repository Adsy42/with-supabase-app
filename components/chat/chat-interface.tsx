"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { saveMessage } from "@/actions/conversations";

interface ChatInterfaceProps {
  conversationId: string;
  matterId?: string;
  initialMessages?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
  }>;
}

/**
 * Chat interface using Vercel AI SDK v5
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
 */
export function ChatInterface({
  conversationId,
  matterId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Manual input state (AI SDK v5 doesn't manage input internally)
  const [input, setInput] = useState("");

  // Create transport with memoization to avoid recreation on each render
  const transport = useCallback(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          conversationId,
          matterId,
          mode: "auto_optimize",
        },
      }),
    [conversationId, matterId]
  );

  // AI SDK v5 useChat hook with DefaultChatTransport
  // Note: initialMessages is not supported in v5, so we track them separately
  const { messages: aiMessages, sendMessage, status, error } = useChat({
    transport: transport(),
  });

  // Combine initial messages with AI messages
  // Initial messages are shown first, then AI SDK manages new messages
  const [hasInitialized, setHasInitialized] = useState(false);
  const displayMessages = useMemo(() => {
    if (hasInitialized) {
      return aiMessages;
    }
    return [
      ...initialMessages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      })),
      ...aiMessages,
    ];
  }, [hasInitialized, aiMessages, initialMessages]);

  // Mark as initialized after first message is sent
  useEffect(() => {
    if (aiMessages.length > 0 && !hasInitialized) {
      setHasInitialized(true);
    }
  }, [aiMessages.length, hasInitialized]);

  const isLoading = status === "streaming" || status === "submitted";

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  // Handle form submission
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Save user message to database
    await saveMessage(conversationId, "user", userMessage);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Mark as initialized since we're sending a message
    setHasInitialized(true);

    // Send message using AI SDK v5 format (parts array)
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: userMessage }],
    });
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  // Handle Enter key (submit) and Shift+Enter (new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  // Extract text content from AI SDK v5 message parts
  const getMessageText = (message: { parts: Array<{ type: string; text?: string }> }): string => {
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="relative mb-4">
              <Bot className="h-12 w-12 text-muted-foreground" />
              <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1" />
            </div>
            <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Ask questions about your documents, get legal research assistance,
              or request help with drafting.
            </p>
          </div>
        )}

        {displayMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <Card
              className={cn(
                "max-w-[80%] p-4",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card"
              )}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap m-0">
                  {getMessageText(message)}
                </p>
              </div>
            </Card>

            {message.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && displayMessages[displayMessages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <Card className="max-w-[80%] p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </Card>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            Error: {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Counsel a question..."
            className="min-h-[44px] max-h-[200px] resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}



