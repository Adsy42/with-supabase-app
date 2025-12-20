-- ============================================================================
-- Counsel Chat Schema
-- Conversations, messages, and document chunks with pgvector for RAG
-- ============================================================================

-- Enable pgvector extension for embeddings
create extension if not exists vector with schema extensions;

-- ============================================================================
-- CONVERSATIONS TABLE
-- Private to user, with optional matter_id for RAG scope
-- ============================================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  matter_id uuid, -- Optional: for scoped RAG context (future)
  title text not null default 'New Conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for faster queries
create index conversations_user_id_idx on public.conversations(user_id);
create index conversations_updated_at_idx on public.conversations(updated_at desc);

-- Enable RLS
alter table public.conversations enable row level security;

-- RLS Policies: Conversations are PRIVATE to owner only
create policy "Users can view own conversations"
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own conversations"
  on public.conversations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own conversations"
  on public.conversations for update
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete own conversations"
  on public.conversations for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- MESSAGES TABLE
-- Chat messages with role, content, model_used, and citations
-- ============================================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model_used text, -- e.g., 'gpt-4o', 'claude-3-5-sonnet'
  prompt_tokens integer,
  completion_tokens integer,
  citations jsonb default '[]'::jsonb, -- Array of citation objects from RAG
  created_at timestamptz not null default now()
);

-- Indexes for faster queries
create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_created_at_idx on public.messages(created_at);

-- Enable RLS
alter table public.messages enable row level security;

-- RLS Policies: Messages inherit privacy from conversation
create policy "Users can view messages in own conversations"
  on public.messages for select
  to authenticated
  using (
    conversation_id in (
      select id from public.conversations
      where user_id = (select auth.uid())
    )
  );

create policy "Users can create messages in own conversations"
  on public.messages for insert
  to authenticated
  with check (
    conversation_id in (
      select id from public.conversations
      where user_id = (select auth.uid())
    )
  );

create policy "Users can update messages in own conversations"
  on public.messages for update
  to authenticated
  using (
    conversation_id in (
      select id from public.conversations
      where user_id = (select auth.uid())
    )
  );

create policy "Users can delete messages in own conversations"
  on public.messages for delete
  to authenticated
  using (
    conversation_id in (
      select id from public.conversations
      where user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- DOCUMENT_CHUNKS TABLE
-- Text chunks with Isaacus embeddings (1792 dimensions) for RAG
-- ============================================================================
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  matter_id uuid, -- Optional: for scoped RAG context (future)
  document_name text not null, -- Original document filename
  chunk_index integer not null, -- Position in document
  content text not null, -- The actual text chunk
  metadata jsonb default '{}'::jsonb, -- Additional metadata (page number, etc.)
  embedding vector(1792), -- Isaacus Kanon-2 embeddings
  created_at timestamptz not null default now()
);

-- Indexes for faster queries
create index document_chunks_user_id_idx on public.document_chunks(user_id);
create index document_chunks_matter_id_idx on public.document_chunks(matter_id);

-- HNSW index for fast vector similarity search
create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Enable RLS
alter table public.document_chunks enable row level security;

-- RLS Policies: Document chunks are private to owner
create policy "Users can view own document chunks"
  on public.document_chunks for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own document chunks"
  on public.document_chunks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own document chunks"
  on public.document_chunks for update
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete own document chunks"
  on public.document_chunks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- MATCH_DOCUMENT_CHUNKS FUNCTION
-- Vector similarity search for RAG pipeline
-- ============================================================================
create or replace function public.match_document_chunks(
  query_embedding vector(1792),
  match_threshold float default 0.7,
  match_count int default 10,
  filter_user_id uuid default null,
  filter_matter_id uuid default null
)
returns table (
  id uuid,
  document_name text,
  chunk_index integer,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    dc.id,
    dc.document_name,
    dc.chunk_index,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where
    -- Apply user filter if provided
    (filter_user_id is null or dc.user_id = filter_user_id)
    -- Apply matter filter if provided
    and (filter_matter_id is null or dc.matter_id = filter_matter_id)
    -- Apply similarity threshold
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- Automatically update updated_at timestamp on conversations
-- ============================================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger conversations_updated_at
  before update on public.conversations
  for each row
  execute function public.handle_updated_at();

-- ============================================================================
-- GRANTS
-- Ensure authenticated users can access these tables
-- ============================================================================
grant usage on schema public to authenticated;
grant all on public.conversations to authenticated;
grant all on public.messages to authenticated;
grant all on public.document_chunks to authenticated;
grant execute on function public.match_document_chunks to authenticated;


