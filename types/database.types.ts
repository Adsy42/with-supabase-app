/**
 * Orderly Database Types
 * 
 * This file should be regenerated after applying migrations:
 * 
 * ```bash
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
 * ```
 * 
 * Or if using local Supabase:
 * 
 * ```bash
 * npx supabase gen types typescript --local > types/database.types.ts
 * ```
 * 
 * For now, these are placeholder types based on the schema.
 * Replace with generated types after running the migration.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          ai_settings: Json;
          model_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          ai_settings?: Json;
          model_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          ai_settings?: Json;
          model_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          org_id: string | null;
          email: string;
          full_name: string | null;
          org_role: "owner" | "admin" | "member" | "viewer";
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id?: string | null;
          email: string;
          full_name?: string | null;
          org_role?: "owner" | "admin" | "member" | "viewer";
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          email?: string;
          full_name?: string | null;
          org_role?: "owner" | "admin" | "member" | "viewer";
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      matters: {
        Row: {
          id: string;
          org_id: string;
          created_by: string | null;
          matter_number: string | null;
          title: string;
          client_name: string | null;
          matter_type: "litigation" | "transaction" | "advisory" | "other" | null;
          status: "active" | "archived" | "closed";
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          created_by?: string | null;
          matter_number?: string | null;
          title: string;
          client_name?: string | null;
          matter_type?: "litigation" | "transaction" | "advisory" | "other" | null;
          status?: "active" | "archived" | "closed";
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          created_by?: string | null;
          matter_number?: string | null;
          title?: string;
          client_name?: string | null;
          matter_type?: "litigation" | "transaction" | "advisory" | "other" | null;
          status?: "active" | "archived" | "closed";
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      matter_members: {
        Row: {
          id: string;
          matter_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
          created_at: string;
        };
        Insert: {
          id?: string;
          matter_id: string;
          user_id: string;
          role?: "owner" | "editor" | "viewer";
          created_at?: string;
        };
        Update: {
          id?: string;
          matter_id?: string;
          user_id?: string;
          role?: "owner" | "editor" | "viewer";
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          matter_id: string;
          uploaded_by: string | null;
          name: string;
          file_type: string | null;
          storage_path: string;
          file_size: number | null;
          processing_status: "pending" | "processing" | "completed" | "failed";
          is_restricted: boolean;
          extracted_fields: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          matter_id: string;
          uploaded_by?: string | null;
          name: string;
          file_type?: string | null;
          storage_path: string;
          file_size?: number | null;
          processing_status?: "pending" | "processing" | "completed" | "failed";
          is_restricted?: boolean;
          extracted_fields?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          matter_id?: string;
          uploaded_by?: string | null;
          name?: string;
          file_type?: string | null;
          storage_path?: string;
          file_size?: number | null;
          processing_status?: "pending" | "processing" | "completed" | "failed";
          is_restricted?: boolean;
          extracted_fields?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_access: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          permission: "view" | "edit";
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          permission?: "view" | "edit";
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          user_id?: string;
          permission?: "view" | "edit";
          created_at?: string;
        };
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          token_count: number | null;
          embedding: number[] | null; // Vector(1792)
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          chunk_index: number;
          content: string;
          token_count?: number | null;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          chunk_index?: number;
          content?: string;
          token_count?: number | null;
          embedding?: number[] | null;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          matter_id: string | null;
          user_id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          matter_id?: string | null;
          user_id: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          matter_id?: string | null;
          user_id?: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          model_used: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          citations: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          model_used?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          citations?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          model_used?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          citations?: Json;
          created_at?: string;
        };
      };
      drafts: {
        Row: {
          id: string;
          matter_id: string;
          created_by: string | null;
          draft_type: "document_draft" | "summary" | "extraction_table" | "comparison_table" | "research_memo";
          name: string;
          content: string;
          metadata: Json;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          matter_id: string;
          created_by?: string | null;
          draft_type: "document_draft" | "summary" | "extraction_table" | "comparison_table" | "research_memo";
          name: string;
          content: string;
          metadata?: Json;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          matter_id?: string;
          created_by?: string | null;
          draft_type?: "document_draft" | "summary" | "extraction_table" | "comparison_table" | "research_memo";
          name?: string;
          content?: string;
          metadata?: Json;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      message_drafts: {
        Row: {
          id: string;
          message_id: string;
          draft_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          draft_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          draft_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_document_chunks: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          p_matter_id?: string;
        };
        Returns: {
          id: string;
          document_id: string;
          content: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

// Helper types for easier usage
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Matter = Database["public"]["Tables"]["matters"]["Row"];
export type MatterMember = Database["public"]["Tables"]["matter_members"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentChunk = Database["public"]["Tables"]["document_chunks"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Draft = Database["public"]["Tables"]["drafts"]["Row"];

// Insert types
export type InsertOrganization = Database["public"]["Tables"]["organizations"]["Insert"];
export type InsertUser = Database["public"]["Tables"]["users"]["Insert"];
export type InsertMatter = Database["public"]["Tables"]["matters"]["Insert"];
export type InsertDocument = Database["public"]["Tables"]["documents"]["Insert"];
export type InsertConversation = Database["public"]["Tables"]["conversations"]["Insert"];
export type InsertMessage = Database["public"]["Tables"]["messages"]["Insert"];
export type InsertDraft = Database["public"]["Tables"]["drafts"]["Insert"];

// Update types
export type UpdateOrganization = Database["public"]["Tables"]["organizations"]["Update"];
export type UpdateUser = Database["public"]["Tables"]["users"]["Update"];
export type UpdateMatter = Database["public"]["Tables"]["matters"]["Update"];
export type UpdateDocument = Database["public"]["Tables"]["documents"]["Update"];
export type UpdateConversation = Database["public"]["Tables"]["conversations"]["Update"];
export type UpdateMessage = Database["public"]["Tables"]["messages"]["Update"];
export type UpdateDraft = Database["public"]["Tables"]["drafts"]["Update"];

// Enum types
export type OrgRole = User["org_role"];
export type MatterMemberRole = MatterMember["role"];
export type MatterType = NonNullable<Matter["matter_type"]>;
export type MatterStatus = Matter["status"];
export type ProcessingStatus = Document["processing_status"];
export type MessageRole = Message["role"];
export type DraftType = Draft["draft_type"];



