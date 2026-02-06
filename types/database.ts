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
      coaching_sessions: {
        Row: {
          id: string;
          user_id: string;
          coach_id: string | null;
          title: string;
          status: 'active' | 'completed';
          summary: string | null;
          breakthrough_summary: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          coach_id?: string | null;
          title?: string;
          status?: 'active' | 'completed';
          summary?: string | null;
          breakthrough_summary?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          title?: string;
          status?: 'active' | 'completed';
          summary?: string | null;
          breakthrough_summary?: string | null;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      session_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant';
          content: string;
          is_insight: boolean;
          insight_title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'user' | 'assistant';
          content: string;
          is_insight?: boolean;
          insight_title?: string | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          is_insight?: boolean;
          insight_title?: string | null;
        };
      };
      session_artifacts: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          type: 'summary' | 'next_actions' | 'seven_day_plan' | 'note';
          format: 'markdown' | 'json';
          content: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          type: 'summary' | 'next_actions' | 'seven_day_plan' | 'note';
          format?: 'markdown' | 'json';
          content: Json;
          created_at?: string;
        };
        Update: {
          format?: 'markdown' | 'json';
          content?: Json;
        };
      };
      key_insights: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          coach_id: string | null;
          title: string;
          content: string;
          category: 'mindset' | 'strategy' | 'productivity' | 'systems' | 'general';
          is_highlighted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          coach_id?: string | null;
          title: string;
          content: string;
          category?: 'mindset' | 'strategy' | 'productivity' | 'systems' | 'general';
          is_highlighted?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          category?: 'mindset' | 'strategy' | 'productivity' | 'systems' | 'general';
          is_highlighted?: boolean;
        };
      };
      breakthroughs: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          coach_id: string | null;
          title: string;
          summary: string;
          key_takeaways: string[];
          action_items: Json;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          coach_id?: string | null;
          title: string;
          summary: string;
          key_takeaways?: string[];
          action_items?: Json;
          date: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          summary?: string;
          key_takeaways?: string[];
          action_items?: Json;
          date?: string;
        };
      };
      insight_collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          theme_keywords: string[];
          color: string;
          icon: string;
          insight_count: number;
          is_auto_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          theme_keywords?: string[];
          color?: string;
          icon?: string;
          insight_count?: number;
          is_auto_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          theme_keywords?: string[];
          color?: string;
          icon?: string;
          insight_count?: number;
          is_auto_generated?: boolean;
          updated_at?: string;
        };
      };
      insight_collection_items: {
        Row: {
          id: string;
          collection_id: string;
          insight_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          insight_id: string;
          created_at?: string;
        };
        Update: {
          collection_id?: string;
          insight_id?: string;
        };
      };
      monthly_synthesis: {
        Row: {
          id: string;
          user_id: string;
          month_year: string;
          title: string;
          executive_summary: string;
          key_themes: Json;
          growth_areas: string[];
          patterns_identified: Json;
          coach_contributions: Json;
          breakthrough_count: number;
          insight_count: number;
          session_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month_year: string;
          title: string;
          executive_summary: string;
          key_themes?: Json;
          growth_areas?: string[];
          patterns_identified?: Json;
          coach_contributions?: Json;
          breakthrough_count?: number;
          insight_count?: number;
          session_count?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          executive_summary?: string;
          key_themes?: Json;
          growth_areas?: string[];
          patterns_identified?: Json;
          coach_contributions?: Json;
          breakthrough_count?: number;
          insight_count?: number;
          session_count?: number;
        };
      };
      history_queries: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          response: string;
          sources: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          query: string;
          response: string;
          sources?: Json;
          created_at?: string;
        };
        Update: {
          query?: string;
          response?: string;
          sources?: Json;
        };
      };
      rituals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          icon: string;
          color: string;
          frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly';
          reminder_time: string | null;
          linked_insight_id: string | null;
          linked_chapter_id: string | null;
          is_active: boolean;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          icon?: string;
          color?: string;
          frequency?: 'daily' | 'weekdays' | 'weekends' | 'weekly';
          reminder_time?: string | null;
          linked_insight_id?: string | null;
          linked_chapter_id?: string | null;
          is_active?: boolean;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          icon?: string;
          color?: string;
          frequency?: 'daily' | 'weekdays' | 'weekends' | 'weekly';
          reminder_time?: string | null;
          linked_insight_id?: string | null;
          linked_chapter_id?: string | null;
          is_active?: boolean;
          order_index?: number;
          updated_at?: string;
        };
      };
      ritual_completions: {
        Row: {
          id: string;
          ritual_id: string;
          user_id: string;
          completed_date: string;
          completed_at: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          ritual_id: string;
          user_id: string;
          completed_date: string;
          completed_at?: string;
          note?: string | null;
        };
        Update: {
          note?: string | null;
        };
      };
      ritual_streaks: {
        Row: {
          id: string;
          user_id: string;
          ritual_id: string;
          current_streak: number;
          longest_streak: number;
          total_completions: number;
          last_completed_date: string | null;
          streak_started_date: string | null;
          consistency_score: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ritual_id: string;
          current_streak?: number;
          longest_streak?: number;
          total_completions?: number;
          last_completed_date?: string | null;
          streak_started_date?: string | null;
          consistency_score?: number;
          updated_at?: string;
        };
        Update: {
          current_streak?: number;
          longest_streak?: number;
          total_completions?: number;
          last_completed_date?: string | null;
          streak_started_date?: string | null;
          consistency_score?: number;
          updated_at?: string;
        };
      };
      daily_reflections: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          reflection_type: 'morning' | 'evening';
          prompt: string | null;
          response: string | null;
          wins: string[];
          lessons: string[];
          ai_closing_thought: string | null;
          mood: number | null;
          energy_level: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          reflection_type: 'morning' | 'evening';
          prompt?: string | null;
          response?: string | null;
          wins?: string[];
          lessons?: string[];
          ai_closing_thought?: string | null;
          mood?: number | null;
          energy_level?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          prompt?: string | null;
          response?: string | null;
          wins?: string[];
          lessons?: string[];
          ai_closing_thought?: string | null;
          mood?: number | null;
          energy_level?: number | null;
          updated_at?: string;
        };
      };
      growth_chapters: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          vision: string | null;
          why_it_matters: string | null;
          target_date: string | null;
          status: 'active' | 'completed' | 'paused' | 'archived';
          cover_color: string;
          icon: string;
          progress_percentage: number;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          vision?: string | null;
          why_it_matters?: string | null;
          target_date?: string | null;
          status?: 'active' | 'completed' | 'paused' | 'archived';
          cover_color?: string;
          icon?: string;
          progress_percentage?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          vision?: string | null;
          why_it_matters?: string | null;
          target_date?: string | null;
          status?: 'active' | 'completed' | 'paused' | 'archived';
          cover_color?: string;
          icon?: string;
          progress_percentage?: number;
          is_primary?: boolean;
          updated_at?: string;
        };
      };
      chapter_milestones: {
        Row: {
          id: string;
          chapter_id: string;
          user_id: string;
          title: string;
          description: string | null;
          is_completed: boolean;
          completed_at: string | null;
          order_index: number;
          linked_rituals: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          order_index?: number;
          linked_rituals?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          order_index?: number;
          linked_rituals?: string[];
          updated_at?: string;
        };
      };
      editorial_nudges: {
        Row: {
          id: string;
          user_id: string;
          nudge_type: 'alignment' | 'encouragement' | 'reflection' | 'milestone';
          title: string;
          content: string;
          related_chapter_id: string | null;
          related_ritual_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nudge_type: 'alignment' | 'encouragement' | 'reflection' | 'milestone';
          title: string;
          content: string;
          related_chapter_id?: string | null;
          related_ritual_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          nudge_type?: 'alignment' | 'encouragement' | 'reflection' | 'milestone';
          title?: string;
          content?: string;
          related_chapter_id?: string | null;
          related_ritual_id?: string | null;
          is_read?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
