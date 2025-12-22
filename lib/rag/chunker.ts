/**
 * Document Chunking Module
 * Splits documents into overlapping chunks for RAG
 * Optimized for legal documents with section awareness
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ChunkOptions {
  /** Target chunk size in characters (default 1500) */
  chunkSize?: number;
  /** Overlap between chunks in characters (default 200) */
  overlap?: number;
  /** Minimum chunk size - don't create tiny chunks (default 100) */
  minChunkSize?: number;
  /** Try to split on paragraph boundaries (default true) */
  respectParagraphs?: boolean;
  /** Try to split on section headers (default true) */
  respectSections?: boolean;
}

export interface DocumentChunk {
  /** Chunk index (0-based) */
  index: number;
  /** Chunk text content */
  content: string;
  /** Character start position in original document */
  startChar: number;
  /** Character end position in original document */
  endChar: number;
  /** Metadata about the chunk */
  metadata: {
    /** Detected section header if any */
    sectionHeader?: string;
    /** Whether this is the first chunk */
    isFirst: boolean;
    /** Whether this is the last chunk */
    isLast: boolean;
  };
}

// ============================================================================
// CHUNKING LOGIC
// ============================================================================

/**
 * Split a document into overlapping chunks
 * Optimized for legal documents - respects paragraphs and section headers
 */
export function chunkDocument(
  text: string,
  options?: ChunkOptions
): DocumentChunk[] {
  const {
    chunkSize = 1500,
    overlap = 200,
    minChunkSize = 100,
    respectParagraphs = true,
    respectSections = true,
  } = options ?? {};

  // Clean the text
  const cleanedText = cleanText(text);

  if (cleanedText.length === 0) {
    return [];
  }

  // If document is small enough, return as single chunk
  if (cleanedText.length <= chunkSize) {
    return [
      {
        index: 0,
        content: cleanedText,
        startChar: 0,
        endChar: cleanedText.length,
        metadata: {
          isFirst: true,
          isLast: true,
        },
      },
    ];
  }

  const chunks: DocumentChunk[] = [];
  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < cleanedText.length) {
    // Calculate end position for this chunk
    let endPos = Math.min(currentPos + chunkSize, cleanedText.length);

    // If we're not at the end, try to find a good break point
    if (endPos < cleanedText.length) {
      const breakPoint = findBreakPoint(
        cleanedText,
        currentPos,
        endPos,
        respectParagraphs,
        respectSections
      );
      if (breakPoint > currentPos + minChunkSize) {
        endPos = breakPoint;
      }
    }

    // Extract chunk content
    const content = cleanedText.slice(currentPos, endPos).trim();

    // Only add if content is meaningful
    if (content.length >= minChunkSize) {
      // Detect section header
      const sectionHeader = detectSectionHeader(content);

      chunks.push({
        index: chunkIndex,
        content,
        startChar: currentPos,
        endChar: endPos,
        metadata: {
          sectionHeader,
          isFirst: chunkIndex === 0,
          isLast: endPos >= cleanedText.length,
        },
      });

      chunkIndex++;
    }

    // Move to next position with overlap
    currentPos = endPos - overlap;

    // Ensure we're making progress
    if (currentPos <= chunks[chunks.length - 1]?.startChar) {
      currentPos = endPos;
    }
  }

  // Mark last chunk
  if (chunks.length > 0) {
    chunks[chunks.length - 1].metadata.isLast = true;
  }

  return chunks;
}

/**
 * Find a good break point for chunking
 * Prioritizes: section headers > paragraph breaks > sentence breaks > word breaks
 */
function findBreakPoint(
  text: string,
  start: number,
  end: number,
  respectParagraphs: boolean,
  respectSections: boolean
): number {
  const searchWindow = text.slice(start, end);
  const windowLength = searchWindow.length;

  // Look in the last 30% of the window for break points
  const searchStart = Math.floor(windowLength * 0.7);
  const searchText = searchWindow.slice(searchStart);

  // Priority 1: Section headers (numbered sections, headings)
  if (respectSections) {
    const sectionPattern = /\n(?=\d+\.\s|[A-Z]{2,}|\#{1,3}\s|ARTICLE|SECTION|SCHEDULE|PART)/g;
    let lastMatch: RegExpExecArray | null = null;
    let match: RegExpExecArray | null;
    while ((match = sectionPattern.exec(searchText)) !== null) {
      lastMatch = match;
    }
    if (lastMatch) {
      return start + searchStart + lastMatch.index + 1;
    }
  }

  // Priority 2: Paragraph breaks (double newlines)
  if (respectParagraphs) {
    const paragraphBreak = searchText.lastIndexOf("\n\n");
    if (paragraphBreak !== -1) {
      return start + searchStart + paragraphBreak + 2;
    }
  }

  // Priority 3: Single newlines
  const lineBreak = searchText.lastIndexOf("\n");
  if (lineBreak !== -1) {
    return start + searchStart + lineBreak + 1;
  }

  // Priority 4: Sentence endings
  const sentencePattern = /[.!?]\s+/g;
  let lastSentence: RegExpExecArray | null = null;
  let sentenceMatch: RegExpExecArray | null;
  while ((sentenceMatch = sentencePattern.exec(searchText)) !== null) {
    lastSentence = sentenceMatch;
  }
  if (lastSentence) {
    return start + searchStart + lastSentence.index + lastSentence[0].length;
  }

  // Priority 5: Word break (space)
  const spaceBreak = searchText.lastIndexOf(" ");
  if (spaceBreak !== -1) {
    return start + searchStart + spaceBreak + 1;
  }

  // Fallback: just use the end position
  return end;
}

/**
 * Detect section header at the start of a chunk
 */
function detectSectionHeader(content: string): string | undefined {
  const lines = content.split("\n").slice(0, 3);

  for (const line of lines) {
    const trimmed = line.trim();

    // Numbered section (e.g., "1. DEFINITIONS", "12.3 Termination")
    const numberedMatch = trimmed.match(/^(\d+\.?\d*\.?\s*.{0,50})/);
    if (numberedMatch && trimmed.length < 100) {
      return numberedMatch[1];
    }

    // All caps header (e.g., "CONFIDENTIALITY", "SCHEDULE A")
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 60) {
      return trimmed;
    }

    // Markdown-style header
    const markdownMatch = trimmed.match(/^#{1,3}\s+(.+)/);
    if (markdownMatch) {
      return markdownMatch[1];
    }

    // Article/Section/Part header
    const legalMatch = trimmed.match(/^(ARTICLE|SECTION|SCHEDULE|PART|EXHIBIT)\s+[A-Z0-9]+/i);
    if (legalMatch) {
      return trimmed.slice(0, 60);
    }
  }

  return undefined;
}

/**
 * Clean text for chunking
 */
function cleanText(text: string): string {
  return text
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove excessive whitespace but preserve paragraph structure
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    // Trim
    .trim();
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Estimate token count (rough approximation)
 * Useful for staying within embedding model limits
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Calculate optimal chunk size based on document length
 */
export function calculateOptimalChunkSize(
  documentLength: number,
  targetChunks: number = 20
): number {
  // Aim for target number of chunks with some overlap
  const baseSize = Math.ceil(documentLength / targetChunks);

  // Clamp between reasonable bounds
  return Math.max(500, Math.min(3000, baseSize));
}

/**
 * Split by legal sections first, then chunk each section
 * Better for structured legal documents
 */
export function chunkLegalDocument(
  text: string,
  options?: ChunkOptions
): DocumentChunk[] {
  // First, try to split by major sections
  const sections = splitByLegalSections(text);

  if (sections.length <= 1) {
    // No clear sections found, use regular chunking
    return chunkDocument(text, options);
  }

  // Chunk each section separately
  const allChunks: DocumentChunk[] = [];
  let globalIndex = 0;
  let globalStartChar = 0;

  for (const section of sections) {
    const sectionChunks = chunkDocument(section.content, options);

    for (const chunk of sectionChunks) {
      allChunks.push({
        ...chunk,
        index: globalIndex,
        startChar: globalStartChar + chunk.startChar,
        endChar: globalStartChar + chunk.endChar,
        metadata: {
          ...chunk.metadata,
          sectionHeader: section.header || chunk.metadata.sectionHeader,
        },
      });
      globalIndex++;
    }

    globalStartChar += section.content.length;
  }

  // Fix isFirst/isLast flags
  if (allChunks.length > 0) {
    allChunks.forEach((c, i) => {
      c.metadata.isFirst = i === 0;
      c.metadata.isLast = i === allChunks.length - 1;
    });
  }

  return allChunks;
}

/**
 * Split document by major legal sections
 */
function splitByLegalSections(
  text: string
): Array<{ header?: string; content: string }> {
  // Pattern for major section headers
  const sectionPattern = /\n(?=(ARTICLE|SECTION|SCHEDULE|PART|EXHIBIT)\s+[A-Z0-9]+|(?:\d+\.)\s+[A-Z])/gi;

  const sections: Array<{ header?: string; content: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(sectionPattern);

  while ((match = regex.exec(text)) !== null) {
    // Add content before this match
    if (match.index > lastIndex) {
      const content = text.slice(lastIndex, match.index).trim();
      if (content) {
        // Try to extract header from previous section
        const header = detectSectionHeader(content);
        sections.push({ header, content });
      }
    }
    lastIndex = match.index + 1; // +1 to skip the newline
  }

  // Add remaining content
  if (lastIndex < text.length) {
    const content = text.slice(lastIndex).trim();
    if (content) {
      const header = detectSectionHeader(content);
      sections.push({ header, content });
    }
  }

  return sections.length > 0 ? sections : [{ content: text }];
}
