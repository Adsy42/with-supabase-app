/**
 * Supabase-backed Store for LangGraph Deep Agents
 *
 * Provides persistent long-term memory storage using Supabase.
 * Implements the LangGraph Store interface for Deep Agents.
 */

import { createClient } from '@/lib/supabase/server';

export interface MemoryItem {
  id: string;
  namespace: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreConfig {
  userId: string;
  defaultNamespace?: string;
}

/**
 * Supabase-backed persistent memory store for Deep Agents
 */
export class SupabaseStore {
  private readonly userId: string;
  private readonly defaultNamespace: string;

  constructor(config: StoreConfig) {
    this.userId = config.userId;
    this.defaultNamespace = config.defaultNamespace || 'default';
  }

  /**
   * Get a value from the store
   */
  async get(key: string, namespace?: string): Promise<unknown | null> {
    const supabase = await createClient();
    const ns = namespace || this.defaultNamespace;

    const { data, error } = await supabase
      .from('agent_memories')
      .select('value')
      .eq('user_id', this.userId)
      .eq('namespace', ns)
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    return data?.value ?? null;
  }

  /**
   * Set a value in the store
   */
  async set(key: string, value: unknown, namespace?: string): Promise<void> {
    const supabase = await createClient();
    const ns = namespace || this.defaultNamespace;

    const { error } = await supabase.from('agent_memories').upsert(
      {
        user_id: this.userId,
        namespace: ns,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,namespace,key',
      }
    );

    if (error) {
      throw error;
    }
  }

  /**
   * Delete a value from the store
   */
  async delete(key: string, namespace?: string): Promise<void> {
    const supabase = await createClient();
    const ns = namespace || this.defaultNamespace;

    const { error } = await supabase
      .from('agent_memories')
      .delete()
      .eq('user_id', this.userId)
      .eq('namespace', ns)
      .eq('key', key);

    if (error) {
      throw error;
    }
  }

  /**
   * List all keys in a namespace
   */
  async list(namespace?: string): Promise<string[]> {
    const supabase = await createClient();
    const ns = namespace || this.defaultNamespace;

    const { data, error } = await supabase
      .from('agent_memories')
      .select('key')
      .eq('user_id', this.userId)
      .eq('namespace', ns)
      .order('key');

    if (error) {
      throw error;
    }

    return data?.map((item) => item.key) ?? [];
  }

  /**
   * Get all items in a namespace
   */
  async getAll(namespace?: string): Promise<MemoryItem[]> {
    const supabase = await createClient();
    const ns = namespace || this.defaultNamespace;

    const { data, error } = await supabase
      .from('agent_memories')
      .select('*')
      .eq('user_id', this.userId)
      .eq('namespace', ns)
      .order('key');

    if (error) {
      throw error;
    }

    return (
      data?.map((item) => ({
        id: item.id,
        namespace: item.namespace,
        key: item.key,
        value: item.value,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      })) ?? []
    );
  }

  /**
   * Search for items by key prefix
   */
  async search(prefix: string, namespace?: string): Promise<MemoryItem[]> {
    const supabase = await createClient();
    const ns = namespace || this.defaultNamespace;

    const { data, error } = await supabase
      .from('agent_memories')
      .select('*')
      .eq('user_id', this.userId)
      .eq('namespace', ns)
      .ilike('key', `${prefix}%`)
      .order('key');

    if (error) {
      throw error;
    }

    return (
      data?.map((item) => ({
        id: item.id,
        namespace: item.namespace,
        key: item.key,
        value: item.value,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      })) ?? []
    );
  }

  /**
   * Clear all items in a namespace
   */
  async clear(namespace?: string): Promise<void> {
    const supabase = await createClient();
    const ns = namespace || this.defaultNamespace;

    const { error } = await supabase
      .from('agent_memories')
      .delete()
      .eq('user_id', this.userId)
      .eq('namespace', ns);

    if (error) {
      throw error;
    }
  }

  /**
   * Get available namespaces for the user
   */
  async namespaces(): Promise<string[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('agent_memories')
      .select('namespace')
      .eq('user_id', this.userId);

    if (error) {
      throw error;
    }

    // Get unique namespaces
    const uniqueNamespaces = [...new Set(data?.map((item) => item.namespace))];
    return uniqueNamespaces.sort();
  }
}

/**
 * Create a Supabase store for a user
 */
export function createSupabaseStore(config: StoreConfig): SupabaseStore {
  return new SupabaseStore(config);
}

/**
 * Todo item for agent task planning
 */
export interface TodoItem {
  id: string;
  conversationId: string;
  parentId?: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  orderIndex: number;
  result?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Supabase-backed todo store for agent task planning
 */
export class SupabaseTodoStore {
  private readonly conversationId: string;

  constructor(conversationId: string) {
    this.conversationId = conversationId;
  }

  /**
   * Add a new todo item
   */
  async add(
    content: string,
    parentId?: string,
    orderIndex?: number
  ): Promise<TodoItem> {
    const supabase = await createClient();

    // Get the next order index if not provided
    let order = orderIndex;
    if (order === undefined) {
      const { data: lastTodo } = await supabase
        .from('agent_todos')
        .select('order_index')
        .eq('conversation_id', this.conversationId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      order = (lastTodo?.order_index ?? -1) + 1;
    }

    const { data, error } = await supabase
      .from('agent_todos')
      .insert({
        conversation_id: this.conversationId,
        parent_id: parentId,
        content,
        status: 'pending',
        order_index: order,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return this.mapTodo(data);
  }

  /**
   * Update a todo item's status
   */
  async updateStatus(
    id: string,
    status: TodoItem['status'],
    result?: string
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('agent_todos')
      .update({
        status,
        result,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  /**
   * Get all todos for the conversation
   */
  async getAll(): Promise<TodoItem[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('agent_todos')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .order('order_index');

    if (error) {
      throw error;
    }

    return data?.map(this.mapTodo) ?? [];
  }

  /**
   * Get pending todos
   */
  async getPending(): Promise<TodoItem[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('agent_todos')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .in('status', ['pending', 'in_progress'])
      .order('order_index');

    if (error) {
      throw error;
    }

    return data?.map(this.mapTodo) ?? [];
  }

  /**
   * Clear all todos for the conversation
   */
  async clear(): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('agent_todos')
      .delete()
      .eq('conversation_id', this.conversationId);

    if (error) {
      throw error;
    }
  }

  private mapTodo(data: Record<string, unknown>): TodoItem {
    return {
      id: data.id as string,
      conversationId: data.conversation_id as string,
      parentId: (data.parent_id as string) || undefined,
      content: data.content as string,
      status: data.status as TodoItem['status'],
      orderIndex: data.order_index as number,
      result: (data.result as string) || undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}

/**
 * Create a todo store for a conversation
 */
export function createTodoStore(conversationId: string): SupabaseTodoStore {
  return new SupabaseTodoStore(conversationId);
}

