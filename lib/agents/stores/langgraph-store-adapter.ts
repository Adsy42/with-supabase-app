/**
 * LangGraph Store Adapter
 *
 * Adapter that wraps SupabaseStore to implement LangGraph's BaseStore interface.
 * This allows the Supabase-backed store to work with LangGraph and deepagents.
 */

import { BaseStore } from '@langchain/core/stores';
import { SupabaseStore } from './supabase-store';

export interface LangGraphStoreConfig {
  userId: string;
  defaultNamespace?: string;
}

/**
 * LangGraph Store adapter that uses Supabase for persistence
 */
export class LangGraphStoreAdapter extends BaseStore<string, unknown> {
  lc_namespace = ['langchain', 'stores', 'supabase'];

  private supabaseStore: SupabaseStore;

  constructor(config: LangGraphStoreConfig) {
    super();
    this.supabaseStore = new SupabaseStore({
      userId: config.userId,
      defaultNamespace: config.defaultNamespace,
    });
  }

  /**
   * Get multiple values from the store
   */
  async mget(keys: string[]): Promise<(unknown | undefined)[]> {
    const results = await Promise.all(
      keys.map(async (key) => {
        try {
          const value = await this.supabaseStore.get(key);
          return value ?? undefined;
        } catch {
          return undefined;
        }
      })
    );
    return results;
  }

  /**
   * Set multiple values in the store
   */
  async mset(keyValuePairs: [string, unknown][]): Promise<void> {
    await Promise.all(
      keyValuePairs.map(([key, value]) => this.supabaseStore.set(key, value))
    );
  }

  /**
   * Delete multiple keys from the store
   */
  async mdelete(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.supabaseStore.delete(key)));
  }

  /**
   * Yield all keys in the store
   */
  async *yieldKeys(prefix?: string): AsyncGenerator<string> {
    const namespace = this.supabaseStore['defaultNamespace'];
    const items = prefix
      ? await this.supabaseStore.search(prefix, namespace)
      : await this.supabaseStore.getAll(namespace);

    for (const item of items) {
      yield item.key;
    }
  }

  /**
   * Get a single value (convenience method)
   */
  async get(key: string): Promise<unknown | undefined> {
    const value = await this.supabaseStore.get(key);
    return value ?? undefined;
  }

  /**
   * Set a single value (convenience method)
   */
  async set(key: string, value: unknown): Promise<void> {
    await this.supabaseStore.set(key, value);
  }

  /**
   * Delete a single key (convenience method)
   */
  async delete(key: string): Promise<void> {
    await this.supabaseStore.delete(key);
  }
}

/**
 * Create a LangGraph Store adapter for a user
 */
export function createLangGraphStore(
  config: LangGraphStoreConfig
): LangGraphStoreAdapter {
  return new LangGraphStoreAdapter(config);
}

