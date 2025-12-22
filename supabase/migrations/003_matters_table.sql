-- ============================================================================
-- Matters Table Migration
-- Legal case/engagement management with document organization
-- Inspired by Harvey AI Vault - stores documents scoped to matters
-- ============================================================================

-- ============================================================================
-- MATTERS TABLE
-- Core entity for organizing documents by legal case/engagement
-- ============================================================================
create table if not exists public.matters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  client_name text,
  matter_number text,  -- Firm's internal reference number
  status text not null default 'active' check (status in ('active', 'archived', 'closed')),
  
  -- Future sharing fields (designed for multi-user collaboration)
  is_shared boolean not null default false,
  shared_with jsonb not null default '[]'::jsonb,
  
  -- Statistics (denormalized for performance)
  document_count integer not null default 0,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists matters_user_id_idx on public.matters(user_id);
create index if not exists matters_status_idx on public.matters(status);
create index if not exists matters_created_at_idx on public.matters(created_at desc);
create index if not exists matters_client_name_idx on public.matters(client_name);

-- Enable RLS
alter table public.matters enable row level security;

-- RLS Policies: Matters are private to owner (future: add sharing policies)
create policy "Users can view own matters"
  on public.matters for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own matters"
  on public.matters for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own matters"
  on public.matters for update
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete own matters"
  on public.matters for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- UPDATE DOCUMENTS TABLE
-- Add foreign key to matters (if documents table exists)
-- ============================================================================
do $$
begin
  -- Add matter_id column if documents table exists and column doesn't exist
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'documents'
  ) then
    if not exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' 
      and table_name = 'documents' 
      and column_name = 'matter_id'
    ) then
      alter table public.documents 
        add column matter_id uuid references public.matters(id) on delete cascade;
      
      create index documents_matter_id_idx on public.documents(matter_id);
    end if;
  end if;
end $$;

-- ============================================================================
-- UPDATE DOCUMENT_CHUNKS TABLE
-- Add foreign key to matters for direct querying
-- ============================================================================
do $$
begin
  -- Update matter_id to reference matters table if not already a FK
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'document_chunks' 
    and column_name = 'matter_id'
  ) then
    -- Drop existing constraint if any (to recreate with proper FK)
    begin
      alter table public.document_chunks 
        drop constraint if exists document_chunks_matter_id_fkey;
    exception when others then
      null; -- Ignore if doesn't exist
    end;
    
    -- Add foreign key to matters
    alter table public.document_chunks 
      add constraint document_chunks_matter_id_fkey 
      foreign key (matter_id) references public.matters(id) on delete cascade;
  end if;
end $$;

-- ============================================================================
-- TRIGGER: Update matter document count
-- ============================================================================
create or replace function update_matter_document_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.matters
    set document_count = document_count + 1, updated_at = now()
    where id = NEW.matter_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.matters
    set document_count = document_count - 1, updated_at = now()
    where id = OLD.matter_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Apply trigger to documents table if it exists
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'documents'
  ) then
    drop trigger if exists update_matter_doc_count on public.documents;
    create trigger update_matter_doc_count
      after insert or delete on public.documents
      for each row
      execute function update_matter_document_count();
  end if;
end $$;

-- ============================================================================
-- TRIGGER: Update matter timestamp on changes
-- ============================================================================
create or replace function update_matter_timestamp()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists update_matter_timestamp on public.matters;
create trigger update_matter_timestamp
  before update on public.matters
  for each row
  execute function update_matter_timestamp();

-- ============================================================================
-- FUNCTION: Get matter statistics
-- ============================================================================
create or replace function get_matter_stats(p_matter_id uuid)
returns table (
  document_count bigint,
  chunk_count bigint,
  has_embeddings boolean,
  last_document_at timestamptz
) as $$
begin
  return query
  select
    count(distinct d.id)::bigint as document_count,
    count(dc.id)::bigint as chunk_count,
    bool_or(dc.embedding is not null) as has_embeddings,
    max(d.created_at) as last_document_at
  from public.documents d
  left join public.document_chunks dc on dc.document_id = d.id
  where d.matter_id = p_matter_id;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- FUNCTION: Search documents within a matter
-- ============================================================================
create or replace function match_matter_documents(
  p_matter_id uuid,
  query_embedding vector(1792),
  match_threshold float default 0.5,
  match_count int default 10
)
returns table (
  id uuid,
  document_name text,
  chunk_index integer,
  content text,
  metadata jsonb,
  similarity float
) as $$
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
  where dc.matter_id = p_matter_id
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$ language plpgsql security definer;

