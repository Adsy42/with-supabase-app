/**
 * Document text extraction
 *
 * Extracts text content from various document formats:
 * - PDF: Uses pdf-parse v2
 * - DOCX: Uses mammoth
 * - TXT: Direct read
 */

import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

export interface ExtractedText {
  content: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Extract text from a PDF buffer
 */
export async function extractFromPdf(buffer: Buffer): Promise<ExtractedText> {
  // Convert Buffer to Uint8Array for pdf-parse
  const data = new Uint8Array(buffer);
  const pdfParse = new PDFParse({ data });
  const textResult = await pdfParse.getText();

  return {
    content: textResult.text,
    pageCount: textResult.pages.length,
    metadata: {},
  };
}

/**
 * Extract text from a DOCX buffer
 */
export async function extractFromDocx(buffer: Buffer): Promise<ExtractedText> {
  const result = await mammoth.extractRawText({ buffer });

  return {
    content: result.value,
    metadata: {
      messages: result.messages,
    },
  };
}

/**
 * Extract text from a plain text buffer
 */
export function extractFromTxt(buffer: Buffer): ExtractedText {
  return {
    content: buffer.toString("utf-8"),
  };
}

/**
 * Extract text from a document buffer based on file type
 */
export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<ExtractedText> {
  const normalizedType = fileType.toLowerCase();

  switch (normalizedType) {
    case "pdf":
      return extractFromPdf(buffer);
    case "docx":
      return extractFromDocx(buffer);
    case "txt":
      return extractFromTxt(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Clean extracted text
 * - Remove excessive whitespace
 * - Normalize line endings
 * - Remove control characters
 */
export function cleanText(text: string): string {
  return (
    text
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove excessive blank lines (more than 2)
      .replace(/\n{3,}/g, "\n\n")
      // Remove leading/trailing whitespace from lines
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Collapse multiple spaces
      .replace(/ +/g, " ")
      .trim()
  );
}
