// Supabase Database Types for CoachZeno
// Generated types for database tables

interface RawDatabase {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          push_token: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          push_token?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          push_token?: string | null;
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
          user_id: string | null;
          name: string;
          tagline: string | null;
          description: string | null;
          icon_name: string;
          color: string;
          method: string;
          version: string;
          is_public: boolean;
          is_imported: boolean | null;
          shared_by: string | null;
          system_prompt: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          tagline?: string | null;
          description?: string | null;
          icon_name: string;
          color: string;
          method: string;
          version: string;
          is_public?: boolean;
          is_imported?: boolean;
          shared_by?: string | null;
          system_prompt: string;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          name?: string;
          tagline?: string | null;
          description?: string | null;
          icon_name?: string;
          color?: string;
          method?: string;
          version?: string;
          is_public?: boolean;
          is_imported?: boolean;
          shared_by?: string | null;
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
      user_integrations: {
        Row: {
          id: string;
          user_id: string;
          provider: 'google_calendar' | 'notion' | 'github' | 'todoist' | 'linear';
          status: 'active' | 'expired' | 'revoked' | 'error';
          provider_email: string | null;
          access_token: string | null;
          refresh_token: string | null;
          token_expires_at: string | null;
          scopes: string[] | null;
          metadata: Json | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: 'google_calendar' | 'notion' | 'github' | 'todoist' | 'linear';
          status?: 'active' | 'expired' | 'revoked' | 'error';
          provider_email?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scopes?: string[] | null;
          metadata?: Json | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'active' | 'expired' | 'revoked' | 'error';
          provider_email?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scopes?: string[] | null;
          metadata?: Json | null;
          last_synced_at?: string | null;
          updated_at?: string;
        };
      };
      integration_data: {
        Row: {
          id: string;
          user_id: string;
          integration_id: string;
          data_type: 'calendar_event' | 'notion_page' | 'github_activity' | 'task';
          external_id: string | null;
          title: string | null;
          content: Json | null;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          integration_id: string;
          data_type: 'calendar_event' | 'notion_page' | 'github_activity' | 'task';
          external_id?: string | null;
          title?: string | null;
          content?: Json | null;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          external_id?: string | null;
          title?: string | null;
          content?: Json | null;
          starts_at?: string | null;
          ends_at?: string | null;
          updated_at?: string;
        };
      };
      credit_accounts: {
        Row: {
          user_id: string;
          tier: 'free' | 'sovereign' | 'oracle';
          balance_mcredits: number;
          period_start: string | null;
          period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tier?: 'free' | 'sovereign' | 'oracle';
          balance_mcredits?: number;
          period_start?: string | null;
          period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tier?: 'free' | 'sovereign' | 'oracle';
          balance_mcredits?: number;
          period_start?: string | null;
          period_end?: string | null;
          updated_at?: string;
        };
      };
      credit_ledger: {
        Row: {
          id: string;
          user_id: string;
          event_type: 'grant' | 'debit' | 'refund' | 'hold' | 'release';
          endpoint: string | null;
          model_id: string | null;
          usage_units: Json;
          usd_cost: number;
          delta_mcredits: number;
          balance_after_mcredits: number;
          request_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: 'grant' | 'debit' | 'refund' | 'hold' | 'release';
          endpoint?: string | null;
          model_id?: string | null;
          usage_units?: Json;
          usd_cost?: number;
          delta_mcredits: number;
          balance_after_mcredits: number;
          request_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          endpoint?: string | null;
          model_id?: string | null;
          usage_units?: Json;
          usd_cost?: number;
          delta_mcredits?: number;
          balance_after_mcredits?: number;
          request_id?: string | null;
          metadata?: Json;
        };
      };
      model_rate_cards: {
        Row: {
          id: string;
          provider: string;
          model_id: string;
          modality: 'text_input' | 'text_output' | 'audio_input' | 'audio_output' | 'character_input' | 'reasoning';
          unit_price_usd_per_million: number;
          effective_date: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          model_id: string;
          modality: 'text_input' | 'text_output' | 'audio_input' | 'audio_output' | 'character_input' | 'reasoning';
          unit_price_usd_per_million: number;
          effective_date?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          provider?: string;
          model_id?: string;
          modality?: 'text_input' | 'text_output' | 'audio_input' | 'audio_output' | 'character_input' | 'reasoning';
          unit_price_usd_per_million?: number;
          effective_date?: string;
          is_active?: boolean;
        };
      };
      tier_model_allowlist: {
        Row: {
          id: string;
          tier: 'free' | 'sovereign' | 'oracle';
          model_id: string;
          enabled: boolean;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tier: 'free' | 'sovereign' | 'oracle';
          model_id: string;
          enabled?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tier?: 'free' | 'sovereign' | 'oracle';
          model_id?: string;
          enabled?: boolean;
          is_default?: boolean;
          updated_at?: string;
        };
      };
      billing_tier_cache: {
        Row: {
          user_id: string;
          tier: 'free' | 'sovereign' | 'oracle';
          source: string;
          verified_at: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tier: 'free' | 'sovereign' | 'oracle';
          source?: string;
          verified_at: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tier?: 'free' | 'sovereign' | 'oracle';
          source?: string;
          verified_at?: string;
          expires_at?: string;
          updated_at?: string;
        };
      };
      voice_live_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          coach_id: string | null;
          model_id: string;
          hold_mcredits: number;
          debited_mcredits: number;
          status: 'active' | 'finalized' | 'cancelled';
          usage_units: Json;
          started_at: string;
          finalized_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          coach_id?: string | null;
          model_id: string;
          hold_mcredits: number;
          debited_mcredits?: number;
          status?: 'active' | 'finalized' | 'cancelled';
          usage_units?: Json;
          started_at?: string;
          finalized_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          session_id?: string | null;
          coach_id?: string | null;
          model_id?: string;
          hold_mcredits?: number;
          debited_mcredits?: number;
          status?: 'active' | 'finalized' | 'cancelled';
          usage_units?: Json;
          started_at?: string;
          finalized_at?: string | null;
          updated_at?: string;
        };
      };
      user_model_preferences: {
        Row: {
          user_id: string;
          preferred_chat_model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          preferred_chat_model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          preferred_chat_model?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_collection_count: {
        Args: {
          collection_id: string;
        };
        Returns: null;
      };
    };
    Enums: Record<string, never>;
  };
}

type WithRelationships<T> = T extends {
  Row: infer RowType;
  Insert: infer InsertType;
  Update: infer UpdateType;
}
  ? {
      Row: RowType;
      Insert: InsertType;
      Update: UpdateType;
      Relationships: [];
    }
  : T;

type NormalizeSchema<T> = T extends {
  Tables: infer TablesType;
  Views: infer ViewsType;
  Functions: infer FunctionsType;
  Enums: infer EnumsType;
}
  ? {
      Tables: {
        [TableName in keyof TablesType]: WithRelationships<TablesType[TableName]>;
      };
      Views: ViewsType;
      Functions: FunctionsType;
      Enums: EnumsType;
    }
  : T;

export type Database = {
  [SchemaName in keyof RawDatabase]: NormalizeSchema<RawDatabase[SchemaName]>;
};

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
