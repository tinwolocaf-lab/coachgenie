// Supabase Database Types for Coachgenie
// Generated types for database tables

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
      };
      context_vaults: {
        Row: {
          id: string;
          user_id: string;
          values: string[];
          goals: Json;
          constraints: Json;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          values: string[];
          goals: Json;
          constraints: Json;
          preferences: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          values?: string[];
          goals?: Json;
          constraints?: Json;
          preferences?: Json;
          updated_at?: string;
        };
      };
      coaches: {
        Row: {
          id: string;
          name: string;
          tagline: string;
          description: string;
          icon_name: string;
          color: string;
          method: string;
          version: string;
          is_public: boolean;
          system_prompt: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tagline: string;
          description: string;
          icon_name: string;
          color: string;
          method: string;
          version: string;
          is_public?: boolean;
          system_prompt: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          tagline?: string;
          description?: string;
          icon_name?: string;
          color?: string;
          method?: string;
          version?: string;
          is_public?: boolean;
          system_prompt?: string;
        };
      };
      installed_coaches: {
        Row: {
          id: string;
          user_id: string;
          coach_id: string;
          is_active: boolean;
          installed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          coach_id: string;
          is_active?: boolean;
          installed_at?: string;
        };
        Update: {
          is_active?: boolean;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          coach_id: string;
          title: string;
          status: 'active' | 'completed';
          summary: string | null;
          artifacts: Json | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          coach_id: string;
          title: string;
          status?: 'active' | 'completed';
          summary?: string | null;
          artifacts?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          title?: string;
          status?: 'active' | 'completed';
          summary?: string | null;
          artifacts?: Json | null;
          completed_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      day_plans: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          top_priorities: Json;
          time_blocks: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          top_priorities: Json;
          time_blocks?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          top_priorities?: Json;
          time_blocks?: Json;
          updated_at?: string;
        };
      };
      next_actions: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          title: string;
          completed: boolean;
          due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          title: string;
          completed?: boolean;
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          completed?: boolean;
          due_date?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
