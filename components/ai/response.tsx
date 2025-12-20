"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

/**
 * Response component for AI-generated content
 * Renders markdown with streaming support
 */

interface ResponseProps {
  children: string;
  isStreaming?: boolean;
  className?: string;
}

export function Response({ children, isStreaming = false, className }: ResponseProps) {
  const content = children || "";

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-p:leading-relaxed prose-p:my-2",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
        "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
        "prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:bg-transparent prose-pre:p-0",
        className
      )}
    >
      <MarkdownRenderer content={content} />
      {isStreaming && <StreamingCursor />}
    </div>
  );
}

/**
 * Simple markdown renderer without external dependencies
 * Handles common patterns: headers, lists, bold, italic, code, links
 */
function MarkdownRenderer({ content }: { content: string }) {
  const elements = parseMarkdown(content);
  
  return <>{elements}</>;
}

function parseMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let codeBlock: { language: string; lines: string[] } | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag key={`list-${elements.length}`} className={listType === "ol" ? "list-decimal" : "list-disc"}>
          {listItems.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };

  const flushCodeBlock = () => {
    if (codeBlock) {
      elements.push(
        <CodeBlock key={`code-${elements.length}`} language={codeBlock.language}>
          {codeBlock.lines.join("\n")}
        </CodeBlock>
      );
      codeBlock = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code block start/end
    if (line.startsWith("```")) {
      if (codeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        codeBlock = {
          language: line.slice(3).trim() || "text",
          lines: [],
        };
      }
      i++;
      continue;
    }

    // Inside code block
    if (codeBlock) {
      codeBlock.lines.push(line);
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      flushList();
      i++;
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const text = headerMatch[2];
      const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
      elements.push(
        <HeadingTag key={`h-${elements.length}`}>
          {parseInline(text)}
        </HeadingTag>
      );
      i++;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(ulMatch[1]);
      i++;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(olMatch[1]);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote key={`bq-${elements.length}`}>
          <p>{parseInline(line.slice(2))}</p>
        </blockquote>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={`hr-${elements.length}`} />);
      i++;
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${elements.length}`}>{parseInline(line)}</p>
    );
    i++;
  }

  flushList();
  flushCodeBlock();

  return elements;
}

/**
 * Parse inline markdown: bold, italic, code, links, citations
 */
function parseInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic *text* or _text_
    const italicMatch = remaining.match(/^[*_]([^*_]+)[*_]/);
    if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code `text`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(<code key={key++}>{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer">
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Citation reference [1]
    const citationMatch = remaining.match(/^\[(\d+)\]/);
    if (citationMatch) {
      parts.push(
        <sup key={key++} className="text-primary font-medium cursor-pointer hover:underline">
          [{citationMatch[1]}]
        </sup>
      );
      remaining = remaining.slice(citationMatch[0].length);
      continue;
    }

    // Regular text - consume until next special char
    const nextSpecial = remaining.search(/[*_`\[]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Special char at start but didn't match - consume single char
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts.length === 1 ? parts[0] : parts;
}

/**
 * Streaming cursor animation
 */
function StreamingCursor() {
  return (
    <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
  );
}

