/**
 * File Parser
 * Extracts text content from various file types for AI processing
 */

// PDF parsing - using pdf-parse for Node.js
// For browser, we'd need a different approach

/**
 * Extract text from a File object
 * Supports: .txt, .md, .json, .csv, and plain text
 * For PDFs: requires server-side processing
 */
export async function extractTextFromFile(file: File): Promise<{
  content: string;
  type: string;
  name: string;
  size: number;
}> {
  const name = file.name;
  const type = file.type || getTypeFromExtension(name);
  const size = file.size;

  // Check file size limit (5MB for text, will be chunked anyway)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (size > MAX_SIZE) {
    throw new Error(`File too large. Maximum size is 5MB.`);
  }

  let content = "";

  // Handle different file types
  if (isTextFile(name, type)) {
    content = await file.text();
  } else if (isPDFFile(name, type)) {
    // PDFs need special handling - return placeholder for now
    // Full implementation would use pdf.js in browser or server endpoint
    content = await extractPDFText(file);
  } else if (isDocxFile(name, type)) {
    // DOCX parsing via server endpoint
    content = await extractDocxText(file);
  } else {
    throw new Error(
      `Unsupported file type: ${type || name.split(".").pop()}. Supported: .txt, .md, .pdf, .json, .csv`
    );
  }

  return { content, type, name, size };
}

/**
 * Check if file is a text-based file
 */
function isTextFile(name: string, type: string): boolean {
  const textExtensions = [".txt", ".md", ".markdown", ".json", ".csv", ".xml", ".html", ".htm"];
  const textTypes = ["text/plain", "text/markdown", "application/json", "text/csv", "text/xml", "text/html"];
  
  return textExtensions.some((e) => name.toLowerCase().endsWith(e)) || textTypes.includes(type);
}

/**
 * Check if file is PDF
 */
function isPDFFile(name: string, type: string): boolean {
  return name.toLowerCase().endsWith(".pdf") || type === "application/pdf";
}

/**
 * Check if file is DOCX
 */
function isDocxFile(name: string, type: string): boolean {
  return (
    name.toLowerCase().endsWith(".docx") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

/**
 * Get MIME type from file extension
 */
function getTypeFromExtension(name: string): string {
  const ext = name.toLowerCase().split(".").pop() || "";
  const types: Record<string, string> = {
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    csv: "text/csv",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xml: "text/xml",
    html: "text/html",
    htm: "text/html",
  };
  return types[ext] || "application/octet-stream";
}

/**
 * Extract text from PDF using browser-compatible method
 * This is a basic implementation - for production, use pdf.js or server-side parsing
 */
async function extractPDFText(file: File): Promise<string> {
  // For client-side PDF parsing, we need pdf.js
  // This is a placeholder that sends the file to an API endpoint
  
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch("/api/files/parse-pdf", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to parse PDF");
    }
    
    const result = await response.json();
    return result.content;
  } catch (error) {
    // If API fails, return a message asking user to paste content
    console.error("PDF parsing error:", error);
    return `[PDF Document: ${file.name}]

Unable to extract PDF text automatically. Please either:
1. Copy and paste the document content directly into the chat
2. Use a text file (.txt) version of the document

If you pasted the content above, I can analyze it now.`;
  }
}

/**
 * Extract text from DOCX using server-side mammoth
 */
async function extractDocxText(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch("/api/files/parse-docx", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to parse DOCX");
    }
    
    const result = await response.json();
    return result.content;
  } catch (error) {
    console.error("DOCX parsing error:", error);
    return `[DOCX Document: ${file.name}]

Unable to extract DOCX text automatically. Please either:
1. Copy and paste the document content directly into the chat
2. Use a PDF or text file (.txt) version of the document

If you pasted the content above, I can analyze it now.`;
  }
}

/**
 * Format file content for inclusion in chat message
 */
export function formatFileContentForChat(
  fileName: string,
  content: string,
  truncateAt = 50000
): string {
  // Truncate very long content
  let processedContent = content;
  if (content.length > truncateAt) {
    processedContent = content.slice(0, truncateAt) + "\n\n[... content truncated ...]";
  }

  return `--- Document: ${fileName} ---

${processedContent}

--- End of ${fileName} ---`;
}

/**
 * Process multiple files and combine their content
 */
export async function processFilesForChat(
  files: File[]
): Promise<{
  combinedContent: string;
  processedFiles: Array<{ name: string; size: number; success: boolean; error?: string }>;
}> {
  const results: Array<{ name: string; size: number; success: boolean; error?: string; content?: string }> = [];

  for (const file of files) {
    try {
      const extracted = await extractTextFromFile(file);
      results.push({
        name: extracted.name,
        size: extracted.size,
        success: true,
        content: extracted.content,
      });
    } catch (error) {
      results.push({
        name: file.name,
        size: file.size,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Combine successful extractions
  const successfulResults = results.filter((r) => r.success && r.content);
  const combinedContent = successfulResults
    .map((r) => formatFileContentForChat(r.name, r.content!))
    .join("\n\n");

  return {
    combinedContent,
    processedFiles: results.map((result) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content, ...rest } = result;
      return rest;
    }),
  };
}

