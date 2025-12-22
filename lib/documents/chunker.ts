/**
 * Document Chunker
 *
 * Splits documents into overlapping chunks suitable for embedding and retrieval.
 * Uses recursive splitting to respect document structure.
 */

export interface TextChunk {
  content: string;
  index: number;
  startChar: number;
  endChar: number;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}

export interface ChunkerOptions {
  /**
   * Target size for each chunk in characters
   * @default 1000
   */
  chunkSize?: number;

  /**
   * Number of characters to overlap between chunks
   * @default 200
   */
  chunkOverlap?: number;

  /**
   * Separators to use for splitting, in order of priority
   * @default ["\n\n", "\n", ". ", " ", ""]
   */
  separators?: string[];

  /**
   * Whether to preserve paragraph structure
   * @default true
   */
  preserveParagraphs?: boolean;

  /**
   * Minimum chunk size (chunks smaller than this will be merged)
   * @default 100
   */
  minChunkSize?: number;

  /**
   * Function to estimate token count (optional)
   */
  tokenCounter?: (text: string) => number;
}

const DEFAULT_SEPARATORS = [
  '\n\n', // Paragraphs
  '\n', // Lines
  '. ', // Sentences
  ', ', // Clauses
  ' ', // Words
  '', // Characters
];

/**
 * Split text into overlapping chunks using recursive character splitting
 */
export function chunkText(text: string, options: ChunkerOptions = {}): TextChunk[] {
  const {
    chunkSize = 1000,
    chunkOverlap = 200,
    separators = DEFAULT_SEPARATORS,
    minChunkSize = 100,
    tokenCounter,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Normalize the text
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Recursively split the text
  const splits = recursiveSplit(normalizedText, separators, chunkSize);

  // Merge small splits and create chunks with overlap
  const chunks = createOverlappingChunks(
    splits,
    chunkSize,
    chunkOverlap,
    minChunkSize
  );

  // Add indices and character positions
  let currentPos = 0;
  const result: TextChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i];
    const startChar = normalizedText.indexOf(content, currentPos);
    const endChar = startChar + content.length;

    const chunk: TextChunk = {
      content,
      index: i,
      startChar: startChar >= 0 ? startChar : currentPos,
      endChar: startChar >= 0 ? endChar : currentPos + content.length,
    };

    // Add token count if counter provided
    if (tokenCounter) {
      chunk.tokenCount = tokenCounter(content);
    }

    result.push(chunk);
    currentPos = chunk.startChar + 1;
  }

  return result;
}

/**
 * Recursively split text using separators
 */
function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number
): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  if (separators.length === 0) {
    // Last resort: split by character count
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  const separator = separators[0];
  const remainingSeparators = separators.slice(1);

  // Split by current separator
  const splits = text.split(separator);

  const result: string[] = [];
  let current = '';

  for (const split of splits) {
    const withSeparator = current ? current + separator + split : split;

    if (withSeparator.length <= chunkSize) {
      current = withSeparator;
    } else {
      // Current chunk is full
      if (current) {
        result.push(current);
      }

      // If split itself is too large, recursively split it
      if (split.length > chunkSize) {
        const subSplits = recursiveSplit(split, remainingSeparators, chunkSize);
        result.push(...subSplits.slice(0, -1));
        current = subSplits[subSplits.length - 1] || '';
      } else {
        current = split;
      }
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

/**
 * Create overlapping chunks from splits
 */
function createOverlappingChunks(
  splits: string[],
  chunkSize: number,
  chunkOverlap: number,
  minChunkSize: number
): string[] {
  if (splits.length === 0) {
    return [];
  }

  // Merge small splits
  const mergedSplits: string[] = [];
  let current = '';

  for (const split of splits) {
    if (current.length + split.length <= chunkSize) {
      current = current ? current + ' ' + split : split;
    } else {
      if (current) {
        mergedSplits.push(current);
      }
      current = split;
    }
  }

  if (current) {
    mergedSplits.push(current);
  }

  // Filter out chunks that are too small (except the last one)
  const filteredSplits = mergedSplits.filter(
    (split, index) =>
      split.length >= minChunkSize || index === mergedSplits.length - 1
  );

  // If we only have one chunk or no overlap, return as is
  if (filteredSplits.length <= 1 || chunkOverlap <= 0) {
    return filteredSplits;
  }

  // Add overlap between chunks
  const chunks: string[] = [];

  for (let i = 0; i < filteredSplits.length; i++) {
    let chunk = filteredSplits[i];

    // Add overlap from next chunk (look ahead)
    if (i < filteredSplits.length - 1) {
      const nextChunk = filteredSplits[i + 1];
      const overlapText = nextChunk.slice(0, chunkOverlap);

      // Only add overlap if it doesn't make chunk too large
      if (chunk.length + overlapText.length <= chunkSize * 1.2) {
        chunk = chunk + ' ' + overlapText;
      }
    }

    chunks.push(chunk.trim());
  }

  return chunks;
}

/**
 * Simple token counter (approximate, ~4 chars per token)
 */
export function simpleTokenCounter(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Create a chunker with preset options
 */
export function createChunker(options: ChunkerOptions = {}) {
  return {
    chunk: (text: string) => chunkText(text, options),
    options,
  };
}

/**
 * Legal document specific chunker with settings optimized for legal content
 */
export function createLegalChunker(options: Partial<ChunkerOptions> = {}) {
  return createChunker({
    chunkSize: 1500, // Larger chunks for legal context
    chunkOverlap: 300, // More overlap to preserve context
    separators: [
      '\n\n\n', // Major sections
      '\n\n', // Paragraphs
      '\n', // Lines
      '. ', // Sentences
      '; ', // Legal clauses often use semicolons
      ', ', // Clauses
      ' ', // Words
      '', // Characters
    ],
    minChunkSize: 200,
    tokenCounter: simpleTokenCounter,
    ...options,
  });
}

