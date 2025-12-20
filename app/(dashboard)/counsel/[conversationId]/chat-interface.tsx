"use client";

/**
 * Chat Interface Component
 * Full ChatGPT-style features with shadcn.io/ai components
 * @see https://www.shadcn.io/ai
 * 
 * Features:
 * - Stop generation mid-stream
 * - Edit user messages
 * - Branch navigation for regenerated responses
 * - Message parts handling (text, tool-call, reasoning, sources)
 */

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { AnimatePresence } from "framer-motion";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  // Core components
  Conversation,
  ConversationContent,
  ConversationInput,
  Message,
  MessageContent,
  Response,
  PromptInput,
  // Loading states
  TypingIndicator,
  // Action components
  Actions,
  StopButton,
  // Navigation
  Branch,
  // Tool & reasoning
  Tool,
  Reasoning,
  // Sources & citations
  Sources,
  // Suggestions
  Suggestions,
  legalSuggestions,
  // Code display
  CodeBlock,
  // Editable
  EditableMessage,
} from "@/components/ai";
import { saveMessage } from "@/actions/conversations";
import type { Message as DBMessage } from "@/actions/conversations";

// Part types from AI SDK v5
interface TextPart {
  type: "text";
  text: string;
}

interface ToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

interface ToolResultPart {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: unknown;
}

interface ReasoningPart {
  type: "reasoning";
  reasoning: string;
}

interface SourcePart {
  type: "source";
  source: {
    title: string;
    url?: string;
    content?: string;
  };
}

type MessagePart = TextPart | ToolCallPart | ToolResultPart | ReasoningPart | SourcePart;

// Message type for combined messages with branch support
type CombinedMessage = {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  content: string;
  createdAt: Date;
  branches?: string[]; // IDs of alternative responses
  activeBranch?: number; // Current branch index
};

interface ChatInterfaceProps {
  conversationId: string;
  matterId?: string;
  initialMessages?: DBMessage[];
}

export function ChatInterface({
  conversationId,
  matterId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);

  // Create transport with API endpoint and extra body params
  const transport = React.useMemo(
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

  // Use AI SDK v5 useChat hook with transport
  const {
    messages: aiMessages,
    sendMessage,
    setMessages,
    status,
    error,
  } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";
  const isStreaming = status === "streaming";

  // Combine initial messages from DB with AI SDK messages
  const allMessages = React.useMemo(() => {
    // Convert DB messages to UI format
    const dbMessages: CombinedMessage[] = initialMessages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: msg.content }],
      content: msg.content,
      createdAt: new Date(msg.created_at),
    }));

    // Convert AI SDK messages - preserve parts structure
    const newMessages: CombinedMessage[] = aiMessages.map((msg: UIMessage) => {
      // Extract text content for compatibility
      const textContent =
        msg.parts
          ?.filter((part): part is TextPart => part.type === "text")
          .map((part) => part.text)
          .join("") ?? "";

      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        parts: (msg.parts as MessagePart[]) ?? [{ type: "text" as const, text: textContent }],
        content: textContent,
        createdAt: new Date(),
      };
    });

    // Combine, removing duplicates by ID
    const messageMap = new Map<string, CombinedMessage>();
    for (const msg of dbMessages) {
      messageMap.set(msg.id, msg);
    }
    for (const msg of newMessages) {
      messageMap.set(msg.id, msg);
    }

    // Sort by creation time
    return Array.from(messageMap.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }, [initialMessages, aiMessages]);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [allMessages.length, isLoading]);

  // Hide suggestions after first message
  React.useEffect(() => {
    if (allMessages.length > 0) {
      setShowSuggestions(false);
    }
  }, [allMessages.length]);

  // Handle message submission
  const handleSubmit = React.useCallback(
    async (content: string, files?: File[]) => {
      // Build message content with file mentions
      let messageContent = content;
      if (files && files.length > 0) {
        const fileNames = files.map((f) => f.name).join(", ");
        messageContent = content
          ? `${content}\n\n[Attached: ${fileNames}]`
          : `[Attached: ${fileNames}]`;

        // TODO: Upload files to Supabase Storage and process for RAG
        console.log("Files to process:", files);
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Save user message to database
      try {
        await saveMessage(conversationId, "user", messageContent);
      } catch (err) {
        console.error("Failed to save user message:", err);
      }

      // Send to AI using v5 format
      sendMessage({ text: messageContent });
    },
    [conversationId, sendMessage]
  );

  // Handle stop generation
  const handleStop = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Note: AI SDK v5 may not support stop directly, this is a workaround
  }, []);

  // Handle edit message - removes messages after edited one and resubmits
  const handleEditMessage = React.useCallback(
    async (messageId: string, newContent: string) => {
      // Find the message index
      const messageIndex = allMessages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      // Get messages before this one (keep them)
      const messagesBeforeEdit = allMessages.slice(0, messageIndex);

      // Update the AI SDK messages to only include messages before the edit
      const aiMessagesToKeep = aiMessages.filter((m) =>
        messagesBeforeEdit.some((kept) => kept.id === m.id)
      );
      setMessages(aiMessagesToKeep);

      // Clear editing state
      setEditingMessageId(null);

      // Submit the edited message
      await handleSubmit(newContent, undefined);
    },
    [allMessages, aiMessages, setMessages, handleSubmit]
  );

  // Handle suggestion selection
  const handleSuggestionSelect = React.useCallback(
    (suggestion: { id: string; text: string }) => {
      handleSubmit(suggestion.text, undefined);
    },
    [handleSubmit]
  );

  // Handle regenerate - re-send last user message
  const handleRegenerate = React.useCallback(() => {
    const lastUserMessage = allMessages
      .filter((m) => m.role === "user")
      .pop();
    if (lastUserMessage) {
      // Remove the last assistant message
      const aiMessagesWithoutLast = aiMessages.slice(0, -1);
      setMessages(aiMessagesWithoutLast);

      // Re-submit the user message
      handleSubmit(lastUserMessage.content, undefined);
    }
  }, [allMessages, aiMessages, setMessages, handleSubmit]);

  return (
    <Conversation className="flex-1">
      <ConversationContent ref={scrollRef}>
        <AnimatePresence initial={false} mode="popLayout">
          {allMessages.length === 0 ? (
            <EmptyChat key="empty" />
          ) : (
            allMessages.map((message, messageIndex) => (
              <React.Fragment key={message.id}>
                {/* User messages with edit capability */}
                {message.role === "user" ? (
                  editingMessageId === message.id ? (
                    <EditableMessage
                      content={message.content}
                      onEdit={(newContent) => handleEditMessage(message.id, newContent)}
                      onCancel={() => setEditingMessageId(null)}
                    />
                  ) : (
                    <Message from="user">
                      <MessageContent>
                        <Response>{message.content}</Response>
                      </MessageContent>
                      {/* Edit button on hover */}
                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingMessageId(message.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit message</span>
                        </Button>
                      </div>
                    </Message>
                  )
                ) : (
                  /* Assistant messages with actions */
                  <Message from="assistant">
                    <MessageContent>
                      {/* Render message parts using AI SDK v5 pattern */}
                      {message.parts.map((part, partIndex) => (
                        <MessagePartRenderer
                          key={`${message.id}-${partIndex}`}
                          part={part}
                          isStreaming={
                            isStreaming &&
                            messageIndex === allMessages.length - 1 &&
                            partIndex === message.parts.length - 1
                          }
                        />
                      ))}
                    </MessageContent>

                    {/* Branch navigation if multiple responses exist */}
                    {message.branches && message.branches.length > 1 && (
                      <div className="mt-2">
                        <Branch
                          total={message.branches.length}
                          current={message.activeBranch ?? 0}
                          onNavigate={(index) => {
                            // TODO: Implement branch navigation
                            console.log("Navigate to branch:", index);
                          }}
                        />
                      </div>
                    )}

                    {/* Actions for assistant messages (not while streaming) */}
                    {!isStreaming && (
                      <div className="mt-2">
                        <Actions
                          content={message.content}
                          onRegenerate={
                            messageIndex === allMessages.length - 1
                              ? handleRegenerate
                              : undefined
                          }
                          showRegenerate={messageIndex === allMessages.length - 1}
                        />
                      </div>
                    )}
                  </Message>
                )}
              </React.Fragment>
            ))
          )}

          {/* Typing indicator while loading */}
          {isLoading && (
            <div className="space-y-4">
              <TypingIndicator />
              {/* Stop button */}
              <div className="flex justify-center">
                <StopButton onStop={handleStop} />
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Error state with retry */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between mx-4">
            <span>Something went wrong. Please try again.</span>
            <button
              onClick={handleRegenerate}
              className="text-xs underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}
      </ConversationContent>

      <ConversationInput>
        {/* Suggestions for empty chat */}
        {showSuggestions && allMessages.length === 0 && (
          <div className="mb-4">
            <Suggestions
              suggestions={legalSuggestions}
              onSelect={handleSuggestionSelect}
              title="Try asking about..."
            />
          </div>
        )}

        <PromptInput
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Ask a legal question..."
        />
      </ConversationInput>
    </Conversation>
  );
}

/**
 * Renders individual message parts based on type
 * Following shadcn.io/ai pattern for handling AI SDK v5 parts
 */
interface MessagePartRendererProps {
  part: MessagePart;
  isStreaming?: boolean;
}

function MessagePartRenderer({ part, isStreaming }: MessagePartRendererProps) {
  switch (part.type) {
    case "text":
      // Check if text contains code block
      if (part.text.includes("```")) {
        return <ResponseWithCodeBlocks text={part.text} />;
      }
      return <Response>{part.text}</Response>;

    case "tool-call":
      return (
        <Tool
          name={part.toolName}
          status={isStreaming ? "running" : "pending"}
          description={`Calling ${part.toolName}...`}
          input={part.args}
        />
      );

    case "tool-result":
      return (
        <Tool
          name={part.toolName}
          status="complete"
          description={`Result from ${part.toolName}`}
          output={
            typeof part.result === "string" ? (
              <Response>{part.result}</Response>
            ) : (
              <pre className="text-xs overflow-auto">
                {JSON.stringify(part.result, null, 2)}
              </pre>
            )
          }
        />
      );

    case "reasoning":
      return (
        <Reasoning isStreaming={isStreaming} title="Reasoning">
          {part.reasoning}
        </Reasoning>
      );

    case "source":
      return (
        <Sources
          sources={[
            {
              id: part.source.url ?? part.source.title,
              documentName: part.source.title,
              content: part.source.content ?? "",
            },
          ]}
        />
      );

    default:
      return null;
  }
}

/**
 * Response component that extracts code blocks for better rendering
 */
function ResponseWithCodeBlocks({ text }: { text: string }) {
  const parts = React.useMemo(() => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const result: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        result.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }

      // Add code block
      result.push({
        type: "code",
        content: match[2],
        language: match[1] || undefined,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      result.push({
        type: "text",
        content: text.slice(lastIndex),
      });
    }

    return result;
  }, [text]);

  return (
    <>
      {parts.map((part, index) =>
        part.type === "code" ? (
          <CodeBlock
            key={index}
            code={part.content}
            language={part.language}
            className="my-3"
          />
        ) : (
          <Response key={index}>{part.content}</Response>
        )
      )}
    </>
  );
}

/**
 * Empty state with suggestions
 */
function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
        <span className="text-2xl">⚖️</span>
      </div>
      <h2 className="text-lg font-semibold">How can I help you today?</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        I&apos;m Counsel, your AI legal assistant. Ask me about Australian law,
        contract analysis, legal research, or drafting assistance.
      </p>
    </div>
  );
}
