/**
 * Document Ingestion API Route
 *
 * Handles document upload, parsing, chunking, and embedding generation.
 * Stores chunks with vectors in Supabase for semantic search.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseDocument, isSupported, DocumentParseError } from '@/lib/documents/parser';
import { createLegalChunker } from '@/lib/documents/chunker';
import { getIsaacusClient } from '@/lib/isaacus/client';

export const maxDuration = 120; // Allow up to 2 minutes for large documents

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Batch size for embedding generation
const EMBEDDING_BATCH_SIZE = 10;

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const matterId = formData.get('matterId') as string | null;
    const documentType = formData.get('documentType') as string | null;
    const jurisdiction = formData.get('jurisdiction') as string | null;
    const practiceArea = formData.get('practiceArea') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!isSupported(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Supported: PDF, DOCX, TXT`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // Create document record
    const { data: document, error: createError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        matter_id: matterId || null,
        name: file.name,
        file_type: file.type,
        file_size: file.size,
        status: 'processing',
        document_type: documentType,
        jurisdiction,
        practice_area: practiceArea,
      })
      .select()
      .single();

    if (createError || !document) {
      console.error('Failed to create document record:', createError);
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      );
    }

    // Process document in background
    processDocument(document.id, file, user.id, matterId, supabase).catch((err) => {
      console.error('Document processing failed:', err);
    });

    return NextResponse.json({
      message: 'Document upload started',
      documentId: document.id,
      status: 'processing',
    });
  } catch (error) {
    console.error('Document ingestion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process document: parse, chunk, embed, and store
 */
async function processDocument(
  documentId: string,
  file: File,
  userId: string,
  matterId: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse document
    const parsed = await parseDocument(buffer, file.type);

    if (!parsed.text || parsed.text.trim().length === 0) {
      throw new DocumentParseError('Document appears to be empty', file.type);
    }

    // Chunk the text
    const chunker = createLegalChunker();
    const chunks = chunker.chunk(parsed.text);

    if (chunks.length === 0) {
      throw new Error('No chunks generated from document');
    }

    // Generate embeddings in batches
    const isaacus = getIsaacusClient();
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const texts = batch.map((c) => c.content);

      const response = await isaacus.embed(texts);
      allEmbeddings.push(...response.embeddings);
    }

    // Prepare chunk records
    const chunkRecords = chunks.map((chunk, index) => ({
      document_id: documentId,
      user_id: userId,
      matter_id: matterId,
      chunk_index: chunk.index,
      content: chunk.content,
      token_count: chunk.tokenCount,
      embedding: JSON.stringify(allEmbeddings[index]),
      metadata: {
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        ...parsed.metadata,
      },
    }));

    // Insert chunks in batches
    const CHUNK_INSERT_BATCH = 50;
    for (let i = 0; i < chunkRecords.length; i += CHUNK_INSERT_BATCH) {
      const batch = chunkRecords.slice(i, i + CHUNK_INSERT_BATCH);
      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(batch);

      if (insertError) {
        throw insertError;
      }
    }

    // Update document status to ready
    await supabase
      .from('documents')
      .update({
        status: 'ready',
        chunk_count: chunks.length,
        metadata: parsed.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    console.log(`Document ${documentId} processed: ${chunks.length} chunks`);
  } catch (error) {
    console.error(`Document ${documentId} processing failed:`, error);

    // Update document status to error
    await supabase
      .from('documents')
      .update({
        status: 'error',
        error_message:
          error instanceof Error ? error.message : 'Processing failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);
  }
}

/**
 * GET: Check document processing status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = request.nextUrl.searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId required' },
        { status: 400 }
      );
    }

    const { data: document, error } = await supabase
      .from('documents')
      .select('id, name, status, chunk_count, error_message, created_at, updated_at')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Get document status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

