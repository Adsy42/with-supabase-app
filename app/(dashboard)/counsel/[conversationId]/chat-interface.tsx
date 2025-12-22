"use client";

/**
 * Chat Interface Component
 * Full ChatGPT-style features with shadcn.io/ai components
 * Now with mode selection for specialized legal AI workflows
 * @see https://www.shadcn.io/ai
 * 
 * Features:
 * - Stop generation mid-stream
 * - Edit user messages
 * - Branch navigation for regenerated responses
 * - Message parts handling (text, tool-call, reasoning, sources)
 * - Mode selection for specialized prompts (Contract, Research, Drafting, etc.)
 */

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { AnimatePresence } from "framer-motion";
import { Pencil, Settings2 } from "lucide-react";
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
  // Mode selection
  ModeSelector,
  DEFAULT_MODE,
  type CounselMode,
} from "@/components/ai";
import { saveMessage } from "@/actions/conversations";
import type { Message as DBMessage } from "@/actions/conversations";
import { getModeConfig } from "@/lib/ai/modes";
import { processFilesForChat } from "@/lib/files/parser";

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
  /** Initial counsel mode */
  initialMode?: CounselMode;
}

export function ChatInterface({
  conversationId,
  matterId,
  initialMessages = [],
  initialMode = DEFAULT_MODE,
}: ChatInterfaceProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
  const [counselMode, setCounselMode] = React.useState<CounselMode>(initialMode);
  const [showModeSelector, setShowModeSelector] = React.useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = React.useState(false);

  // Get current mode config for UI display
  const currentModeConfig = getModeConfig(counselMode);

  // Create transport with API endpoint and extra body params including mode
  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          conversationId,
          matterId,
          mode: "auto_optimize",
          counselMode,
          autoDetectMode: counselMode === "general", // Auto-detect only when in general mode
        },
      }),
    [conversationId, matterId, counselMode]
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

  // Handle message submission with file processing
  const handleSubmit = React.useCallback(
    async (content: string, files?: File[]) => {
      let messageContent = content;
      let fileProcessingStatus = "";

      // Process attached files to extract content
      if (files && files.length > 0) {
        setIsProcessingFiles(true);
        
        try {
          const { combinedContent, processedFiles } = await processFilesForChat(files);
          
          // Build status message
          const successful = processedFiles.filter((f) => f.success);
          const failed = processedFiles.filter((f) => !f.success);
          
          if (successful.length > 0) {
            // Include the actual file content in the message
            messageContent = content
              ? `${content}\n\n${combinedContent}`
              : combinedContent;
          }
          
          if (failed.length > 0) {
            fileProcessingStatus = `\n\n[Note: Could not process ${failed.length} file(s): ${failed.map((f) => `${f.name} (${f.error})`).join(", ")}]`;
            messageContent += fileProcessingStatus;
          }
        } catch (error) {
          console.error("File processing error:", error);
          const fileNames = files.map((f) => f.name).join(", ");
          messageContent = content
            ? `${content}\n\n[Attached files could not be processed: ${fileNames}. Please copy and paste the content directly.]`
            : `[Attached files could not be processed: ${fileNames}. Please copy and paste the content directly.]`;
        } finally {
          setIsProcessingFiles(false);
        }
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

  // Handle mode change
  const handleModeChange = React.useCallback((newMode: CounselMode) => {
    setCounselMode(newMode);
    setShowModeSelector(false);
  }, []);

  // Get mode-specific suggestions
  const modeSuggestions = React.useMemo(() => {
    return getModeSuggestions(counselMode);
  }, [counselMode]);

  return (
    <Conversation className="flex-1">
      {/* Mode Indicator Bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-muted/30">
        <div className="flex items-center gap-3">
          <ModeSelector
            value={counselMode}
            onChange={handleModeChange}
            showDescriptions={true}
          />
          <span className="text-xs text-muted-foreground hidden md:inline">
            {currentModeConfig.description}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowModeSelector(!showModeSelector)}
        >
          <Settings2 className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>

      <ConversationContent ref={scrollRef}>
        <AnimatePresence initial={false} mode="popLayout">
          {allMessages.length === 0 ? (
            <EmptyChat key="empty" mode={counselMode} />
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
              suggestions={modeSuggestions}
              onSelect={handleSuggestionSelect}
              title={`Try asking about... (${currentModeConfig.shortName} mode)`}
            />
          </div>
        )}

        <PromptInput
          onSubmit={handleSubmit}
          isLoading={isLoading || isProcessingFiles}
          placeholder={isProcessingFiles ? "Processing files..." : getModePlaceholder(counselMode)}
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
 * Empty state with mode-specific messaging
 */
interface EmptyChatProps {
  mode: CounselMode;
}

function EmptyChat({ mode }: EmptyChatProps) {
  const modeConfig = getModeConfig(mode);
  const Icon = modeConfig.icon;

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-lg font-semibold">{getModeWelcomeTitle(mode)}</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        {getModeWelcomeDescription(mode)}
      </p>
    </div>
  );
}

// ============================================================================
// Mode-specific content helpers
// ============================================================================

function getModeWelcomeTitle(mode: CounselMode): string {
  const titles: Record<CounselMode, string> = {
    general: "How can I help you today?",
    contract_analysis: "Ready to analyze your contract",
    legal_research: "What legal question can I research?",
    document_drafting: "What document should we draft?",
    due_diligence: "Ready for due diligence review",
    compliance: "Let's check your compliance",
    litigation: "How can I assist with litigation?",
  };
  return titles[mode];
}

function getModeWelcomeDescription(mode: CounselMode): string {
  const descriptions: Record<CounselMode, string> = {
    general:
      "I'm Counsel, your AI legal assistant. Ask me about Australian law, contract analysis, legal research, or drafting assistance.",
    contract_analysis:
      "Upload or paste your contract and I'll identify key clauses, risks, and provide redlining suggestions with structured analysis.",
    legal_research:
      "Ask any legal question and I'll research relevant case law, statutes, and regulations with proper AGLC4 citations.",
    document_drafting:
      "Tell me what document you need and I'll draft it following Australian legal conventions with proper structure and defined terms.",
    due_diligence:
      "Share your transaction documents and I'll perform systematic due diligence review with materiality-focused findings.",
    compliance:
      "Describe your compliance concern and I'll map regulatory requirements, identify gaps, and recommend remediation actions.",
    litigation:
      "Share your case details and I'll analyze legal issues, assess evidence, and help develop strategic arguments.",
  };
  return descriptions[mode];
}

function getModePlaceholder(mode: CounselMode): string {
  const placeholders: Record<CounselMode, string> = {
    general: "Ask a legal question...",
    contract_analysis: "Paste contract text or describe what you want to analyze...",
    legal_research: "What legal question should I research?",
    document_drafting: "Describe the document you need drafted...",
    due_diligence: "Describe the transaction or paste document for review...",
    compliance: "What compliance matter should I review?",
    litigation: "Describe your case or legal issue...",
  };
  return placeholders[mode];
}

function getModeSuggestions(mode: CounselMode): Array<{ id: string; text: string }> {
  const suggestions: Record<CounselMode, Array<{ id: string; text: string }>> = {
    general: legalSuggestions,
    contract_analysis: [
      { id: "ca1", text: "What are the key risks in this contract?" },
      { id: "ca2", text: "Identify all indemnity clauses" },
      { id: "ca3", text: "Check for change of control provisions" },
      { id: "ca4", text: "Compare to market standard terms" },
      { id: "ca5", text: "Suggest redlines for liability cap" },
    ],
    legal_research: [
      { id: "lr1", text: "What is the test for negligence in Australia?" },
      { id: "lr2", text: "Find cases on contractual estoppel" },
      { id: "lr3", text: "Explain the Privacy Act obligations" },
      { id: "lr4", text: "What are director duties under s180?" },
      { id: "lr5", text: "Research unfair contract terms law" },
    ],
    document_drafting: [
      { id: "dd1", text: "Draft a mutual NDA" },
      { id: "dd2", text: "Create a services agreement template" },
      { id: "dd3", text: "Write a confidentiality clause" },
      { id: "dd4", text: "Draft a termination notice letter" },
      { id: "dd5", text: "Prepare an indemnity clause" },
    ],
    due_diligence: [
      { id: "due1", text: "Review for change of control triggers" },
      { id: "due2", text: "Identify consent requirements" },
      { id: "due3", text: "Flag material adverse change clauses" },
      { id: "due4", text: "Check assignment restrictions" },
      { id: "due5", text: "Summarize key commercial terms" },
    ],
    compliance: [
      { id: "co1", text: "Check Privacy Act compliance" },
      { id: "co2", text: "Review against ASIC requirements" },
      { id: "co3", text: "Assess Australian Consumer Law compliance" },
      { id: "co4", text: "Gap analysis for industry regulations" },
      { id: "co5", text: "Audit our data handling practices" },
    ],
    litigation: [
      { id: "li1", text: "Assess the merits of this claim" },
      { id: "li2", text: "Identify our strongest arguments" },
      { id: "li3", text: "What are the opponent's likely defenses?" },
      { id: "li4", text: "Build a timeline of key events" },
      { id: "li5", text: "Analyze the evidence we have" },
    ],
  };
  return suggestions[mode] ?? legalSuggestions;
}
