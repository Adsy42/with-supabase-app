"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * CodeBlock component for syntax-highlighted code
 * Used for contract clauses, definitions, and technical content
 */

interface CodeBlockProps {
  children: string;
  language?: string;
  title?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  children,
  language = "text",
  title,
  className,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = children.split("\n");

  return (
    <div className={cn("relative group rounded-lg overflow-hidden", className)}>
      {/* Header */}
      {(title || language !== "text") && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">
            {title || language}
          </span>
          <CopyButton onClick={handleCopy} copied={copied} />
        </div>
      )}

      {/* Code content */}
      <div className="relative bg-muted/30">
        {!title && language === "text" && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton onClick={handleCopy} copied={copied} />
          </div>
        )}

        <pre className="overflow-x-auto p-4 text-sm">
          <code className={`language-${language}`}>
            {showLineNumbers ? (
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="pr-4 text-right text-muted-foreground select-none w-8">
                        {i + 1}
                      </td>
                      <td className="whitespace-pre">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              children
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}

/**
 * Copy button with feedback
 */
function CopyButton({ onClick, copied }: { onClick: () => void; copied: boolean }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      className="h-7 w-7"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

