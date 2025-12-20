"use client";

/**
 * Response Component
 * Streaming-optimized markdown renderer for AI responses
 * Based on shadcn.io/ai patterns
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponseProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string;
}

/**
 * Simple markdown-like rendering for AI responses
 * Handles basic formatting without heavy dependencies
 */
export function Response({ children, className, ...props }: ResponseProps) {
  const formattedContent = React.useMemo(() => {
    if (!children) return null;

    // Split by double newlines for paragraphs
    const paragraphs = children.split(/\n\n+/);

    return paragraphs.map((paragraph, pIndex) => {
      // Handle code blocks
      if (paragraph.startsWith("```")) {
        const lines = paragraph.split("\n");
        const language = lines[0].slice(3);
        const code = lines.slice(1, -1).join("\n");

        return (
          <pre
            key={pIndex}
            className="my-3 overflow-x-auto rounded-lg bg-muted p-4 text-sm"
          >
            {language && (
              <div className="mb-2 text-xs text-muted-foreground">{language}</div>
            )}
            <code>{code}</code>
          </pre>
        );
      }

      // Handle headers
      if (paragraph.startsWith("### ")) {
        return (
          <h3 key={pIndex} className="mt-4 mb-2 text-base font-semibold">
            {paragraph.slice(4)}
          </h3>
        );
      }
      if (paragraph.startsWith("## ")) {
        return (
          <h2 key={pIndex} className="mt-4 mb-2 text-lg font-semibold">
            {paragraph.slice(3)}
          </h2>
        );
      }
      if (paragraph.startsWith("# ")) {
        return (
          <h1 key={pIndex} className="mt-4 mb-2 text-xl font-bold">
            {paragraph.slice(2)}
          </h1>
        );
      }

      // Handle lists
      if (paragraph.match(/^[-*]\s/m)) {
        const items = paragraph.split(/\n/).filter((line) => line.trim());
        return (
          <ul key={pIndex} className="my-2 list-disc pl-6 space-y-1">
            {items.map((item, iIndex) => (
              <li key={iIndex} className="text-sm">
                {formatInlineText(item.replace(/^[-*]\s+/, ""))}
              </li>
            ))}
          </ul>
        );
      }

      // Handle numbered lists
      if (paragraph.match(/^\d+\.\s/m)) {
        const items = paragraph.split(/\n/).filter((line) => line.trim());
        return (
          <ol key={pIndex} className="my-2 list-decimal pl-6 space-y-1">
            {items.map((item, iIndex) => (
              <li key={iIndex} className="text-sm">
                {formatInlineText(item.replace(/^\d+\.\s+/, ""))}
              </li>
            ))}
          </ol>
        );
      }

      // Regular paragraph with inline formatting
      return (
        <p key={pIndex} className="my-2 text-sm leading-relaxed">
          {formatInlineText(paragraph)}
        </p>
      );
    });
  }, [children]);

  return (
    <div className={cn("prose-legal", className)} {...props}>
      {formattedContent}
    </div>
  );
}

/**
 * Format inline text (bold, italic, code, links)
 */
function formatInlineText(text: string): React.ReactNode {
  if (!text) return null;

  // Split by inline code first
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, index) => {
    // Inline code
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold text
    let formatted: React.ReactNode = part;
    formatted = part.split(/(\*\*[^*]+\*\*)/g).map((segment, i) => {
      if (segment.startsWith("**") && segment.endsWith("**")) {
        return <strong key={i}>{segment.slice(2, -2)}</strong>;
      }
      return segment;
    });

    return <React.Fragment key={index}>{formatted}</React.Fragment>;
  });
}

