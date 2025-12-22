"use client";

/**
 * Response Component
 * Streaming-optimized markdown renderer for AI responses
 * Based on shadcn.io/ai patterns
 * @see https://www.shadcn.io/ai
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponseProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string;
}

/**
 * Response - Renders AI response with markdown formatting
 * Optimized for streaming text display
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
            className="my-4 overflow-x-auto rounded-xl bg-zinc-900 dark:bg-zinc-950 p-4 text-sm"
          >
            {language && (
              <div className="mb-3 text-xs text-zinc-500 font-mono">{language}</div>
            )}
            <code className="text-zinc-100 font-mono">{code}</code>
          </pre>
        );
      }

      // Handle headers
      if (paragraph.startsWith("### ")) {
        return (
          <h3 key={pIndex} className="mt-6 mb-3 text-base font-semibold text-foreground">
            {paragraph.slice(4)}
          </h3>
        );
      }
      if (paragraph.startsWith("## ")) {
        return (
          <h2 key={pIndex} className="mt-6 mb-3 text-lg font-semibold text-foreground">
            {paragraph.slice(3)}
          </h2>
        );
      }
      if (paragraph.startsWith("# ")) {
        return (
          <h1 key={pIndex} className="mt-6 mb-3 text-xl font-bold text-foreground">
            {paragraph.slice(2)}
          </h1>
        );
      }

      // Handle blockquotes
      if (paragraph.startsWith("> ")) {
        return (
          <blockquote
            key={pIndex}
            className="my-4 border-l-2 border-primary/50 pl-4 text-muted-foreground italic"
          >
            {formatInlineText(paragraph.slice(2))}
          </blockquote>
        );
      }

      // Handle lists
      if (paragraph.match(/^[-*]\s/m)) {
        const items = paragraph.split(/\n/).filter((line) => line.trim());
        return (
          <ul key={pIndex} className="my-3 space-y-1.5 pl-4">
            {items.map((item, iIndex) => (
              <li key={iIndex} className="flex gap-2 text-sm text-foreground">
                <span className="text-primary mt-1.5 text-xs">•</span>
                <span>{formatInlineText(item.replace(/^[-*]\s+/, ""))}</span>
              </li>
            ))}
          </ul>
        );
      }

      // Handle numbered lists
      if (paragraph.match(/^\d+\.\s/m)) {
        const items = paragraph.split(/\n/).filter((line) => line.trim());
        return (
          <ol key={pIndex} className="my-3 space-y-1.5 pl-4 list-decimal list-inside">
            {items.map((item, iIndex) => (
              <li key={iIndex} className="text-sm text-foreground">
                {formatInlineText(item.replace(/^\d+\.\s+/, ""))}
              </li>
            ))}
          </ol>
        );
      }

      // Regular paragraph with inline formatting
      return (
        <p key={pIndex} className="my-3 text-sm leading-7 text-foreground">
          {formatInlineText(paragraph)}
        </p>
      );
    });
  }, [children]);

  return (
    <div className={cn("", className)} {...props}>
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
          className="rounded-md bg-muted px-1.5 py-0.5 text-[13px] font-mono text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold text
    let formatted: React.ReactNode = part;
    formatted = part.split(/(\*\*[^*]+\*\*)/g).map((segment, i) => {
      if (segment.startsWith("**") && segment.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {segment.slice(2, -2)}
          </strong>
        );
      }
      // Handle italic within non-bold segments
      return segment.split(/(_[^_]+_)/g).map((italicSegment, j) => {
        if (italicSegment.startsWith("_") && italicSegment.endsWith("_")) {
          return (
            <em key={`${i}-${j}`} className="italic">
              {italicSegment.slice(1, -1)}
            </em>
          );
        }
        return italicSegment;
      });
    });

    return <React.Fragment key={index}>{formatted}</React.Fragment>;
  });
}
