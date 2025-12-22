-- ============================================================================
-- Documents Table Migration
-- Tracks uploaded documents with Isaacus classification metadata
-- ============================================================================

-- ============================================================================
-- DOCUMENTS TABLE
-- Parent table for document_chunks, tracks upload status and classification
-- ============================================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  matter_id uuid, -- Optional: for scoped RAG context
  name text not null, -- Original file name
  file_type text not null, -- MIME type
  file_size integer not null, -- Size in bytes
  chunk_count integer not null default 0,
  status text not null default 'processing' check (status in ('processing', 'ready', 'error')),
  
  -- Isaacus classification metadata
  document_type text, -- e.g., 'commercial_agreement', 'employment_contract'
  jurisdiction text, -- e.g., 'Australian (NSW)', 'United States'
  practice_area text, -- e.g., 'Corporate/Commercial', 'Employment'
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_matter_id_idx on public.documents(matter_id);
create index if not exists documents_status_idx on public.documents(status);
create index if not exists documents_created_at_idx on public.documents(created_at desc);

-- Enable RLS
alter table public.documents enable row level security;

-- RLS Policies
create policy "Users can view own documents"
  on public.documents for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own documents"
  on public.documents for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own documents"
  on public.documents for update
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete own documents"
  on public.documents for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- UPDATE DOCUMENT_CHUNKS TABLE
-- Add document_id foreign key for better tracking
-- ============================================================================

-- Add document_id column if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'document_chunks' 
    and column_name = 'document_id'
  ) then
    alter table public.document_chunks 
      add column document_id uuid references public.documents(id) on delete cascade;
    
    create index document_chunks_document_id_idx on public.document_chunks(document_id);
  end if;
end $$;

-- ============================================================================
-- HELPER FUNCTION: Update document timestamp on chunk changes
-- ============================================================================
create or replace function update_document_timestamp()
returns trigger as $$
begin
  if NEW.document_id is not null then
    update public.documents
    set updated_at = now()
    where id = NEW.document_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- Create trigger if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'update_document_on_chunk_change'
  ) then
    create trigger update_document_on_chunk_change
      after insert or update on public.document_chunks
      for each row
      execute function update_document_timestamp();
  end if;
end $$;

-- ============================================================================
-- HELPER FUNCTION: Get document statistics
-- ============================================================================
create or replace function get_document_stats(p_user_id uuid)
returns table (
  total_documents bigint,
  total_chunks bigint,
  documents_with_embeddings bigint,
  documents_by_type jsonb
) as $$
begin
  return query
  select
    count(distinct d.id)::bigint as total_documents,
    count(dc.id)::bigint as total_chunks,
    count(distinct case when dc.embedding is not null then d.id end)::bigint as documents_with_embeddings,
    coalesce(
      jsonb_object_agg(
        coalesce(d.document_type, 'unclassified'),
        type_counts.cnt
      ),
      '{}'::jsonb
    ) as documents_by_type
  from public.documents d
  left join public.document_chunks dc on dc.document_id = d.id
  left join lateral (
    select document_type, count(*) as cnt
    from public.documents
    where user_id = p_user_id
    group by document_type
  ) type_counts on type_counts.document_type = d.document_type
  where d.user_id = p_user_id;
end;
$$ language plpgsql security definer;

