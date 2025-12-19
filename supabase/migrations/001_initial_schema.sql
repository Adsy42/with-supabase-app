-- Orderly Legal AI Platform - Initial Schema
-- Phase 1.1: Database schema with RLS policies and pgvector

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Organizations (Law Firms)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ai_settings JSONB DEFAULT '{}',
  model_preferences JSONB DEFAULT '{"default_model": "auto", "provider": "openai"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  org_role TEXT DEFAULT 'member' CHECK (org_role IN ('owner', 'admin', 'member', 'viewer')),
  preferences JSONB DEFAULT '{"theme": "dark", "notifications": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MATTERS (Document Workspaces)
-- ============================================================================

-- Matters (Legal Cases/Projects)
CREATE TABLE matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id),
  matter_number TEXT,
  title TEXT NOT NULL,
  client_name TEXT,
  matter_type TEXT CHECK (matter_type IN ('litigation', 'transaction', 'advisory', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matter Members (Access Control)
CREATE TABLE matter_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(matter_id, user_id)
);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  name TEXT NOT NULL,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  is_restricted BOOLEAN DEFAULT FALSE,
  extracted_fields JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Access (Optional RBAC for restricted docs)
CREATE TABLE document_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Document Chunks (for RAG with Isaacus embeddings - 1792 dimensions)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding VECTOR(1792), -- Isaacus Kanon 2 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONVERSATIONS (Private per user)
-- ============================================================================

-- Conversations (Private AI chat sessions)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model_used TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  citations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DRAFTS (Shared work products)
-- ============================================================================

-- Drafts
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID REFERENCES matters(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id),
  draft_type TEXT NOT NULL CHECK (draft_type IN ('document_draft', 'summary', 'extraction_table', 'comparison_table', 'research_memo')),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message-Draft link (which message created which draft)
CREATE TABLE message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Performance indexes
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_matters_org ON matters(org_id);
CREATE INDEX idx_matters_created_by ON matters(created_by);
CREATE INDEX idx_matter_members_matter ON matter_members(matter_id);
CREATE INDEX idx_matter_members_user ON matter_members(user_id);
CREATE INDEX idx_documents_matter ON documents(matter_id);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_matter ON conversations(matter_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_drafts_matter ON drafts(matter_id);

-- Vector similarity search index (IVFFlat for production)
-- Note: For small datasets, exact search is fine. Add this when you have >10k chunks.
-- CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Organizations: Users can only see their own organization
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- ----------------------------------------------------------------------------
-- Users: Users can see members of their organization
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------------------------
-- Matters: Access via matter_members
-- ----------------------------------------------------------------------------
CREATE POLICY "Access matters via membership"
  ON matters FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Create matters in own org"
  ON matters FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Update matters as member"
  ON matters FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
  );

CREATE POLICY "Delete matters as owner"
  ON matters FOR DELETE
  TO authenticated
  USING (
    id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ----------------------------------------------------------------------------
-- Matter Members: Access via matter membership
-- ----------------------------------------------------------------------------
CREATE POLICY "View matter members"
  ON matter_members FOR SELECT
  TO authenticated
  USING (
    matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can manage members"
  ON matter_members FOR ALL
  TO authenticated
  USING (
    matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ----------------------------------------------------------------------------
-- Documents: Access via matter membership + RBAC for restricted
-- ----------------------------------------------------------------------------
CREATE POLICY "Access documents via matter"
  ON documents FOR SELECT
  TO authenticated
  USING (
    matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid())
    AND (
      is_restricted = FALSE
      OR id IN (SELECT document_id FROM document_access WHERE user_id = auth.uid())
      OR uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Upload documents to matter"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
  );

CREATE POLICY "Update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ----------------------------------------------------------------------------
-- Document Access: Managed by document owner or matter owner
-- ----------------------------------------------------------------------------
CREATE POLICY "View document access"
  ON document_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR document_id IN (SELECT id FROM documents WHERE uploaded_by = auth.uid())
  );

CREATE POLICY "Manage document access"
  ON document_access FOR ALL
  TO authenticated
  USING (
    document_id IN (SELECT id FROM documents WHERE uploaded_by = auth.uid())
    OR document_id IN (
      SELECT d.id FROM documents d
      JOIN matter_members mm ON d.matter_id = mm.matter_id
      WHERE mm.user_id = auth.uid() AND mm.role = 'owner'
    )
  );

-- ----------------------------------------------------------------------------
-- Document Chunks: Access via document access
-- ----------------------------------------------------------------------------
CREATE POLICY "Access chunks via document"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid())
      AND (
        is_restricted = FALSE
        OR id IN (SELECT document_id FROM document_access WHERE user_id = auth.uid())
        OR uploaded_by = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage chunks"
  ON document_chunks FOR ALL
  TO service_role
  USING (true);

-- ----------------------------------------------------------------------------
-- Conversations: PRIVATE to the user who created them
-- ----------------------------------------------------------------------------
CREATE POLICY "Conversations are private"
  ON conversations FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Messages: Access via conversation ownership
-- ----------------------------------------------------------------------------
CREATE POLICY "Messages via conversation"
  ON messages FOR ALL
  TO authenticated
  USING (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  )
  WITH CHECK (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Drafts: Shared within matter
-- ----------------------------------------------------------------------------
CREATE POLICY "Access drafts via matter"
  ON drafts FOR SELECT
  TO authenticated
  USING (
    matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Create drafts in matter"
  ON drafts FOR INSERT
  TO authenticated
  WITH CHECK (
    matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
  );

CREATE POLICY "Update own drafts"
  ON drafts FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Delete drafts"
  ON drafts FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR matter_id IN (SELECT matter_id FROM matter_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ----------------------------------------------------------------------------
-- Message Drafts: Access via message or draft access
-- ----------------------------------------------------------------------------
CREATE POLICY "Access message drafts"
  ON message_drafts FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM messages WHERE conversation_id IN (
        SELECT id FROM conversations WHERE user_id = auth.uid()
      )
    )
    OR draft_id IN (
      SELECT id FROM drafts WHERE matter_id IN (
        SELECT matter_id FROM matter_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Create message drafts"
  ON message_drafts FOR INSERT
  TO authenticated
  WITH CHECK (
    message_id IN (
      SELECT id FROM messages WHERE conversation_id IN (
        SELECT id FROM conversations WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matters_updated_at
  BEFORE UPDATE ON matters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create user profile and org on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_email TEXT;
  org_name TEXT;
BEGIN
  user_email := NEW.email;
  
  -- Check if user already exists (idempotency for retries)
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Determine organization name
  org_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'organization_name', '')), '');
  IF org_name IS NULL THEN
    org_name := split_part(user_email, '@', 1) || '''s Organisation';
  END IF;
  
  -- Create a new organization for the user
  INSERT INTO organizations (name, slug)
  VALUES (
    org_name,
    LOWER(REPLACE(NEW.id::TEXT, '-', ''))
  )
  RETURNING id INTO new_org_id;
  
  -- Create the user profile
  INSERT INTO users (id, org_id, email, full_name, org_role)
  VALUES (
    NEW.id,
    new_org_id,
    user_email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(user_email, '@', 1)),
    'owner'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition - org/user already created
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail auth
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding VECTOR(1792),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  p_matter_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    (p_matter_id IS NULL OR d.matter_id = p_matter_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

