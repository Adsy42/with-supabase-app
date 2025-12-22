/**
 * Document Parser
 *
 * Extracts text content from PDF and DOCX files.
 * Handles various document formats commonly used in legal work.
 */

// We'll use dynamic imports to handle optional dependencies gracefully
type PDFParseResult = {
  text: string;
  numpages: number;
  info: Record<string, unknown>;
};

type MammothResult = {
  value: string;
  messages: Array<{ type: string; message: string }>;
};

export interface ParsedDocument {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    charCount: number;
    title?: string;
    author?: string;
    createdAt?: string;
    modifiedAt?: string;
  };
  warnings: string[];
}

export interface ParserOptions {
  /** Maximum text length to extract (0 = unlimited) */
  maxLength?: number;
  /** Whether to preserve formatting hints */
  preserveFormatting?: boolean;
}

/**
 * Parse a PDF file and extract its text content
 */
export async function parsePDF(
  buffer: Buffer | ArrayBuffer,
  options: ParserOptions = {}
): Promise<ParsedDocument> {
  const warnings: string[] = [];

  try {
    // Dynamic import for pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule = await import('pdf-parse') as any;
    const pdfParse = pdfParseModule.default || pdfParseModule;

    const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const result: PDFParseResult = await pdfParse(data);

    let text = result.text;

    // Clean up the text
    text = cleanText(text, options.preserveFormatting);

    // Truncate if needed
    if (options.maxLength && text.length > options.maxLength) {
      text = text.slice(0, options.maxLength);
      warnings.push(`Text truncated to ${options.maxLength} characters`);
    }

    return {
      text,
      metadata: {
        pageCount: result.numpages,
        wordCount: countWords(text),
        charCount: text.length,
        title: (result.info?.Title as string) || undefined,
        author: (result.info?.Author as string) || undefined,
        createdAt: (result.info?.CreationDate as string) || undefined,
        modifiedAt: (result.info?.ModDate as string) || undefined,
      },
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new DocumentParseError(`Failed to parse PDF: ${message}`, 'pdf');
  }
}

/**
 * Parse a DOCX file and extract its text content
 */
export async function parseDOCX(
  buffer: Buffer | ArrayBuffer,
  options: ParserOptions = {}
): Promise<ParsedDocument> {
  const warnings: string[] = [];

  try {
    // Dynamic import for mammoth
    const mammoth = await import('mammoth');

    const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const result: MammothResult = await mammoth.extractRawText({ buffer: data });

    let text = result.value;

    // Add any mammoth warnings
    for (const msg of result.messages) {
      if (msg.type === 'warning') {
        warnings.push(msg.message);
      }
    }

    // Clean up the text
    text = cleanText(text, options.preserveFormatting);

    // Truncate if needed
    if (options.maxLength && text.length > options.maxLength) {
      text = text.slice(0, options.maxLength);
      warnings.push(`Text truncated to ${options.maxLength} characters`);
    }

    return {
      text,
      metadata: {
        wordCount: countWords(text),
        charCount: text.length,
      },
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new DocumentParseError(`Failed to parse DOCX: ${message}`, 'docx');
  }
}

/**
 * Parse a plain text file
 */
export function parsePlainText(
  content: string,
  options: ParserOptions = {}
): ParsedDocument {
  const warnings: string[] = [];
  let text = content;

  // Clean up the text
  text = cleanText(text, options.preserveFormatting);

  // Truncate if needed
  if (options.maxLength && text.length > options.maxLength) {
    text = text.slice(0, options.maxLength);
    warnings.push(`Text truncated to ${options.maxLength} characters`);
  }

  return {
    text,
    metadata: {
      wordCount: countWords(text),
      charCount: text.length,
    },
    warnings,
  };
}

/**
 * Parse a document based on its file type
 */
export async function parseDocument(
  buffer: Buffer | ArrayBuffer,
  fileType: string,
  options: ParserOptions = {}
): Promise<ParsedDocument> {
  const normalizedType = fileType.toLowerCase().replace('.', '');

  switch (normalizedType) {
    case 'pdf':
    case 'application/pdf':
      return parsePDF(buffer, options);

    case 'docx':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDOCX(buffer, options);

    case 'doc':
    case 'application/msword':
      throw new DocumentParseError(
        'Legacy .doc format is not supported. Please convert to .docx',
        'doc'
      );

    case 'txt':
    case 'text/plain':
      const text = Buffer.isBuffer(buffer)
        ? buffer.toString('utf-8')
        : new TextDecoder().decode(buffer);
      return parsePlainText(text, options);

    default:
      throw new DocumentParseError(
        `Unsupported file type: ${fileType}`,
        normalizedType
      );
  }
}

/**
 * Clean extracted text
 */
function cleanText(text: string, preserveFormatting?: boolean): string {
  if (preserveFormatting) {
    // Just normalize line endings and trim
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  }

  return (
    text
      // Normalize whitespace
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove excessive spaces
      .replace(/[ \t]+/g, ' ')
      // Clean up lines
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .trim()
  );
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Custom error class for document parsing errors
 */
export class DocumentParseError extends Error {
  constructor(
    message: string,
    public readonly fileType: string
  ) {
    super(message);
    this.name = 'DocumentParseError';
  }
}

/**
 * Supported file types for parsing
 */
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt'] as const;

/**
 * Check if a file type is supported
 */
export function isSupported(fileType: string): boolean {
  const normalized = fileType.toLowerCase().replace('.', '');
  return (
    SUPPORTED_FILE_TYPES.includes(fileType as (typeof SUPPORTED_FILE_TYPES)[number]) ||
    SUPPORTED_EXTENSIONS.includes(normalized as (typeof SUPPORTED_EXTENSIONS)[number])
  );
}

