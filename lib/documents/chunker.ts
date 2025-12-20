/**
 * Document chunking for RAG
 *
 * Splits documents into overlapping chunks for vector embedding.
 * Respects natural boundaries like paragraphs and sections.
 */

export interface Chunk {
  content: string;
  index: number;
  tokenCount: number;
  metadata?: {
    startChar?: number;
    endChar?: number;
    section?: string;
  };
}

export interface ChunkerOptions {
  /** Target chunk size in tokens (default: 500) */
  chunkSize?: number;
  /** Overlap between chunks in tokens (default: 50) */
  chunkOverlap?: number;
  /** Separators to split on, in order of priority */
  separators?: string[];
}

const DEFAULT_OPTIONS: Required<ChunkerOptions> = {
  chunkSize: 500,
  chunkOverlap: 50,
  separators: [
    "\n\n\n", // Major section breaks
    "\n\n", // Paragraphs
    "\n", // Lines
    ". ", // Sentences
    "! ",
    "? ",
    "; ",
    ", ",
    " ", // Words
    "", // Characters (last resort)
  ],
};

/**
 * Simple token count estimation
 * Uses ~4 characters per token as a rough estimate
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text on a separator
 */
function splitOnSeparator(text: string, separator: string): string[] {
  if (separator === "") {
    return text.split("");
  }
  return text.split(separator);
}

/**
 * Recursively split text into chunks
 */
function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number
): string[] {
  const tokens = estimateTokens(text);

  // Base case: text is small enough
  if (tokens <= chunkSize) {
    return [text];
  }

  // Try each separator
  for (const separator of separators) {
    const splits = splitOnSeparator(text, separator);

    if (splits.length === 1) {
      // Separator not found, try next
      continue;
    }

    const chunks: string[] = [];
    let currentChunk = "";

    for (const split of splits) {
      const withSeparator =
        currentChunk + (currentChunk ? separator : "") + split;
      const tokensWithSeparator = estimateTokens(withSeparator);

      if (tokensWithSeparator <= chunkSize) {
        currentChunk = withSeparator;
      } else if (currentChunk) {
        // Save current chunk and start new one
        chunks.push(currentChunk);
        currentChunk = split;
      } else {
        // Split is too large, recurse with remaining separators
        const subChunks = recursiveSplit(
          split,
          separators.slice(separators.indexOf(separator) + 1),
          chunkSize
        );
        chunks.push(...subChunks);
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    if (chunks.length > 0) {
      return chunks;
    }
  }

  // Last resort: split by characters
  const result: string[] = [];
  let start = 0;
  const charLimit = chunkSize * 4; // Approximate chars for token limit

  while (start < text.length) {
    result.push(text.slice(start, start + charLimit));
    start += charLimit;
  }

  return result;
}

/**
 * Add overlap between chunks
 */
function addOverlap(chunks: string[], overlapTokens: number): string[] {
  if (chunks.length <= 1 || overlapTokens === 0) {
    return chunks;
  }

  const overlapChars = overlapTokens * 4;
  const result: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];

    // Add overlap from previous chunk
    if (i > 0) {
      const prev = chunks[i - 1];
      const overlap = prev.slice(-overlapChars);
      chunk = overlap + chunk;
    }

    result.push(chunk);
  }

  return result;
}

/**
 * Chunk a document into overlapping segments
 */
export function chunkText(
  text: string,
  options: ChunkerOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Clean and normalize text
  const cleanedText = text.trim();

  if (!cleanedText) {
    return [];
  }

  // Split into initial chunks
  let chunks = recursiveSplit(cleanedText, opts.separators, opts.chunkSize);

  // Add overlap
  chunks = addOverlap(chunks, opts.chunkOverlap);

  // Create chunk objects with metadata
  let charPosition = 0;

  return chunks.map((content, index) => {
    const chunk: Chunk = {
      content: content.trim(),
      index,
      tokenCount: estimateTokens(content),
      metadata: {
        startChar: charPosition,
        endChar: charPosition + content.length,
      },
    };

    // Update position (account for separator that was removed)
    charPosition += content.length;

    return chunk;
  });
}

/**
 * Smart chunking that preserves document structure
 * Detects sections, headers, and maintains context
 */
export function smartChunk(
  text: string,
  options: ChunkerOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Detect section headers (lines that might be headers)
  const headerPatterns = [
    /^#{1,6}\s+.+$/gm, // Markdown headers
    /^[A-Z][^.!?]*[.:]?\s*$/gm, // All caps or title case lines
    /^\d+\.\s+.+$/gm, // Numbered sections
    /^[IVX]+\.\s+.+$/gm, // Roman numeral sections
  ];

  // Find all potential section breaks
  const sections: { start: number; end: number; header?: string }[] = [];
  let lastEnd = 0;

  for (const pattern of headerPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastEnd) {
        sections.push({
          start: lastEnd,
          end: match.index,
        });
      }
      sections.push({
        start: match.index,
        end: match.index + match[0].length,
        header: match[0],
      });
      lastEnd = match.index + match[0].length;
    }
  }

  // Add final section
  if (lastEnd < text.length) {
    sections.push({
      start: lastEnd,
      end: text.length,
    });
  }

  // If no sections detected, use regular chunking
  if (sections.length === 0) {
    return chunkText(text, options);
  }

  // Chunk each section separately, then combine
  const allChunks: Chunk[] = [];
  let currentHeader: string | undefined;

  for (const section of sections) {
    const sectionText = text.slice(section.start, section.end);

    if (section.header) {
      currentHeader = section.header;
    }

    const sectionChunks = chunkText(sectionText, opts);

    // Add section context to chunks
    for (const chunk of sectionChunks) {
      chunk.metadata = {
        ...chunk.metadata,
        section: currentHeader,
      };
      chunk.index = allChunks.length;
      allChunks.push(chunk);
    }
  }

  return allChunks;
}



