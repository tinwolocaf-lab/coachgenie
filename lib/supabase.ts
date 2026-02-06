// Supabase client configuration
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database as RawDatabase } from '@/types/database';

type AddRelationships<TableDef> = TableDef extends {
  Row: infer Row;
  Insert: infer Insert;
  Update: infer Update;
}
  ? {
      Row: Row;
      Insert: Insert;
      Update: Update;
      Relationships: [];
    }
  : TableDef;

type NormalizeSchema<Schema> = Schema extends {
  Tables: infer Tables;
  Views: infer Views;
  Functions: infer Functions;
  Enums: infer Enums;
}
  ? {
      Tables: {
        [TableName in keyof Tables]: AddRelationships<Tables[TableName]>;
      };
      Views: Views;
      Functions: Functions;
      Enums: Enums;
    }
  : never;

export type Database = Omit<RawDatabase, 'public'> & {
  public: NormalizeSchema<RawDatabase['public']>;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create Supabase client (with fallback for unconfigured state)
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
