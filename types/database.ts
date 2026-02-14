export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      billing_tier_cache: {
        Row: {
          created_at: string
          expires_at: string
          source: string
          tier: string
          updated_at: string
          user_id: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          source?: string
          tier: string
          updated_at?: string
          user_id: string
          verified_at: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          source?: string
          tier?: string
          updated_at?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_tier_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      breakthroughs: {
        Row: {
          action_items: Json
          coach_id: string | null
          created_at: string | null
          date: string
          id: string
          key_takeaways: string[]
          session_id: string | null
          summary: string
          title: string
          user_id: string
        }
        Insert: {
          action_items?: Json
          coach_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          key_takeaways?: string[]
          session_id?: string | null
          summary: string
          title: string
          user_id: string
        }
        Update: {
          action_items?: Json
          coach_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          key_takeaways?: string[]
          session_id?: string | null
          summary?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakthroughs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakthroughs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakthroughs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_milestones: {
        Row: {
          chapter_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          is_completed: boolean
          linked_rituals: string[]
          order_index: number
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chapter_id: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          linked_rituals?: string[]
          order_index?: number
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          linked_rituals?: string[]
          order_index?: number
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_milestones_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "growth_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_deletion_requests: {
        Row: {
          admin_reason: string | null
          coach_id: string
          created_at: string
          id: string
          reason: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_reason?: string | null
          coach_id: string
          created_at?: string
          id?: string
          reason: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_reason?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          reason?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_deletion_requests_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_shares: {
        Row: {
          coach_config: Json
          coach_id: string
          created_at: string | null
          creator_id: string
          id: string
          is_active: boolean
          share_id: string
          uses_count: number
        }
        Insert: {
          coach_config: Json
          coach_id: string
          created_at?: string | null
          creator_id: string
          id?: string
          is_active?: boolean
          share_id: string
          uses_count?: number
        }
        Update: {
          coach_config?: Json
          coach_id?: string
          created_at?: string | null
          creator_id?: string
          id?: string
          is_active?: boolean
          share_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      coaches: {
        Row: {
          author_name: string | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string
          icon_name: string | null
          icon_path: string | null
          id: string
          image_path: string | null
          image_url: string | null
          is_custom: boolean | null
          is_featured: boolean
          is_public: boolean | null
          marketplace_status: string | null
          method: string | null
          name: string
          published_at: string | null
          slug: string
          system_prompt: string | null
          tagline: string | null
          tags: string[]
          updated_at: string
          user_id: string | null
          version: string | null
          visibility: string
        }
        Insert: {
          author_name?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          icon_name?: string | null
          icon_path?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_custom?: boolean | null
          is_featured?: boolean
          is_public?: boolean | null
          marketplace_status?: string | null
          method?: string | null
          name: string
          published_at?: string | null
          slug: string
          system_prompt?: string | null
          tagline?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
          version?: string | null
          visibility?: string
        }
        Update: {
          author_name?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          icon_name?: string | null
          icon_path?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_custom?: boolean | null
          is_featured?: boolean
          is_public?: boolean | null
          marketplace_status?: string | null
          method?: string | null
          name?: string
          published_at?: string | null
          slug?: string
          system_prompt?: string | null
          tagline?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
          version?: string | null
          visibility?: string
        }
        Relationships: []
      }
      coaching_sessions: {
        Row: {
          breakthrough_summary: string | null
          coach_id: string
          coach_snapshot: Json | null
          completed_at: string | null
          created_at: string | null
          id: string
          status: string
          summary: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          breakthrough_summary?: string | null
          coach_id: string
          coach_snapshot?: Json | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          breakthrough_summary?: string | null
          coach_id?: string
          coach_snapshot?: Json | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      context_vaults: {
        Row: {
          constraints: Json
          created_at: string | null
          goals: Json
          id: string
          preferences: Json
          updated_at: string | null
          user_id: string
          values: string[]
        }
        Insert: {
          constraints?: Json
          created_at?: string | null
          goals?: Json
          id?: string
          preferences?: Json
          updated_at?: string | null
          user_id: string
          values?: string[]
        }
        Update: {
          constraints?: Json
          created_at?: string | null
          goals?: Json
          id?: string
          preferences?: Json
          updated_at?: string | null
          user_id?: string
          values?: string[]
        }
        Relationships: []
      }
      credit_accounts: {
        Row: {
          balance_mcredits: number
          created_at: string
          period_end: string | null
          period_start: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_mcredits?: number
          created_at?: string
          period_end?: string | null
          period_start?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_mcredits?: number
          created_at?: string
          period_end?: string | null
          period_start?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          balance_after_mcredits: number
          created_at: string
          delta_mcredits: number
          endpoint: string | null
          event_type: string
          id: string
          metadata: Json
          model_id: string | null
          request_id: string | null
          usage_units: Json
          usd_cost: number
          user_id: string
        }
        Insert: {
          balance_after_mcredits: number
          created_at?: string
          delta_mcredits: number
          endpoint?: string | null
          event_type: string
          id?: string
          metadata?: Json
          model_id?: string | null
          request_id?: string | null
          usage_units?: Json
          usd_cost?: number
          user_id: string
        }
        Update: {
          balance_after_mcredits?: number
          created_at?: string
          delta_mcredits?: number
          endpoint?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          model_id?: string | null
          request_id?: string | null
          usage_units?: Json
          usd_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reflections: {
        Row: {
          ai_closing_thought: string | null
          created_at: string | null
          date: string
          energy_level: number | null
          id: string
          lessons: string[]
          mood: number | null
          prompt: string | null
          reflection_type: string
          response: string | null
          updated_at: string | null
          user_id: string
          wins: string[]
        }
        Insert: {
          ai_closing_thought?: string | null
          created_at?: string | null
          date: string
          energy_level?: number | null
          id?: string
          lessons?: string[]
          mood?: number | null
          prompt?: string | null
          reflection_type: string
          response?: string | null
          updated_at?: string | null
          user_id: string
          wins?: string[]
        }
        Update: {
          ai_closing_thought?: string | null
          created_at?: string | null
          date?: string
          energy_level?: number | null
          id?: string
          lessons?: string[]
          mood?: number | null
          prompt?: string | null
          reflection_type?: string
          response?: string | null
          updated_at?: string | null
          user_id?: string
          wins?: string[]
        }
        Relationships: []
      }
      editorial_nudges: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean
          nudge_type: string
          related_chapter_id: string | null
          related_ritual_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          nudge_type: string
          related_chapter_id?: string | null
          related_ritual_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          nudge_type?: string
          related_chapter_id?: string | null
          related_ritual_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_nudges_related_chapter_id_fkey"
            columns: ["related_chapter_id"]
            isOneToOne: false
            referencedRelation: "growth_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_nudges_related_ritual_id_fkey"
            columns: ["related_ritual_id"]
            isOneToOne: false
            referencedRelation: "rituals"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_chapters: {
        Row: {
          cover_color: string
          created_at: string | null
          icon: string
          id: string
          is_primary: boolean
          progress_percentage: number
          status: string
          target_date: string | null
          title: string
          updated_at: string | null
          user_id: string
          vision: string | null
          why_it_matters: string | null
        }
        Insert: {
          cover_color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_primary?: boolean
          progress_percentage?: number
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          vision?: string | null
          why_it_matters?: string | null
        }
        Update: {
          cover_color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_primary?: boolean
          progress_percentage?: number
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          vision?: string | null
          why_it_matters?: string | null
        }
        Relationships: []
      }
      history_queries: {
        Row: {
          created_at: string | null
          id: string
          query: string
          response: string
          sources: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          response: string
          sources?: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          response?: string
          sources?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "history_queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_collection_items: {
        Row: {
          collection_id: string
          created_at: string | null
          id: string
          insight_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          id?: string
          insight_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          id?: string
          insight_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "insight_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_collection_items_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "key_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_collections: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          insight_count: number
          is_auto_generated: boolean
          name: string
          theme_keywords: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          insight_count?: number
          is_auto_generated?: boolean
          name: string
          theme_keywords?: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          insight_count?: number
          is_auto_generated?: boolean
          name?: string
          theme_keywords?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      key_insights: {
        Row: {
          category: string
          coach_id: string | null
          content: string
          created_at: string | null
          id: string
          is_highlighted: boolean
          session_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          coach_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_highlighted?: boolean
          session_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          coach_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_highlighted?: boolean
          session_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_insights_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_insights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      installed_coaches: {
        Row: {
          coach_id: string
          installed_at: string
          is_active: boolean
          snapshot_color: string | null
          snapshot_description: string | null
          snapshot_icon_name: string | null
          snapshot_image_url: string | null
          snapshot_method: string | null
          snapshot_name: string | null
          snapshot_system_prompt: string | null
          snapshot_tagline: string | null
          snapshot_version: string | null
          uninstalled_at: string | null
          user_id: string
        }
        Insert: {
          coach_id: string
          installed_at?: string
          is_active?: boolean
          snapshot_color?: string | null
          snapshot_description?: string | null
          snapshot_icon_name?: string | null
          snapshot_image_url?: string | null
          snapshot_method?: string | null
          snapshot_name?: string | null
          snapshot_system_prompt?: string | null
          snapshot_tagline?: string | null
          snapshot_version?: string | null
          uninstalled_at?: string | null
          user_id: string
        }
        Update: {
          coach_id?: string
          installed_at?: string
          is_active?: boolean
          snapshot_color?: string | null
          snapshot_description?: string | null
          snapshot_icon_name?: string | null
          snapshot_image_url?: string | null
          snapshot_method?: string | null
          snapshot_name?: string | null
          snapshot_system_prompt?: string | null
          snapshot_tagline?: string | null
          snapshot_version?: string | null
          uninstalled_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installed_coaches_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_data: {
        Row: {
          content: Json | null
          created_at: string
          data_type: string
          ends_at: string | null
          external_id: string | null
          id: string
          integration_id: string
          starts_at: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          data_type: string
          ends_at?: string | null
          external_id?: string | null
          id?: string
          integration_id: string
          starts_at?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          data_type?: string
          ends_at?: string | null
          external_id?: string | null
          id?: string
          integration_id?: string
          starts_at?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_data_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_rate_cards: {
        Row: {
          created_at: string
          effective_date: string
          id: string
          is_active: boolean
          modality: string
          model_id: string
          provider: string
          unit_price_usd_per_million: number
        }
        Insert: {
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          modality: string
          model_id: string
          provider: string
          unit_price_usd_per_million: number
        }
        Update: {
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          modality?: string
          model_id?: string
          provider?: string
          unit_price_usd_per_million?: number
        }
        Relationships: []
      }
      monthly_synthesis: {
        Row: {
          breakthrough_count: number
          coach_contributions: Json
          created_at: string | null
          executive_summary: string
          growth_areas: string[]
          id: string
          insight_count: number
          key_themes: Json
          month_year: string
          patterns_identified: Json
          session_count: number
          title: string
          user_id: string
        }
        Insert: {
          breakthrough_count?: number
          coach_contributions?: Json
          created_at?: string | null
          executive_summary: string
          growth_areas?: string[]
          id?: string
          insight_count?: number
          key_themes?: Json
          month_year: string
          patterns_identified?: Json
          session_count?: number
          title: string
          user_id: string
        }
        Update: {
          breakthrough_count?: number
          coach_contributions?: Json
          created_at?: string | null
          executive_summary?: string
          growth_areas?: string[]
          id?: string
          insight_count?: number
          key_themes?: Json
          month_year?: string
          patterns_identified?: Json
          session_count?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_synthesis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          push_token: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          push_token?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          push_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ritual_completions: {
        Row: {
          completed_at: string | null
          completed_date: string
          id: string
          note: string | null
          ritual_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_date: string
          id?: string
          note?: string | null
          ritual_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_date?: string
          id?: string
          note?: string | null
          ritual_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritual_completions_ritual_id_fkey"
            columns: ["ritual_id"]
            isOneToOne: false
            referencedRelation: "rituals"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_streaks: {
        Row: {
          consistency_score: number
          current_streak: number
          id: string
          last_completed_date: string | null
          longest_streak: number
          ritual_id: string
          streak_started_date: string | null
          total_completions: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consistency_score?: number
          current_streak?: number
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          ritual_id: string
          streak_started_date?: string | null
          total_completions?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consistency_score?: number
          current_streak?: number
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          ritual_id?: string
          streak_started_date?: string | null
          total_completions?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritual_streaks_ritual_id_fkey"
            columns: ["ritual_id"]
            isOneToOne: false
            referencedRelation: "rituals"
            referencedColumns: ["id"]
          },
        ]
      }
      rituals: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          frequency: string
          icon: string
          id: string
          is_active: boolean
          linked_chapter_id: string | null
          linked_insight_id: string | null
          order_index: number
          reminder_time: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          description?: string | null
          frequency?: string
          icon?: string
          id?: string
          is_active?: boolean
          linked_chapter_id?: string | null
          linked_insight_id?: string | null
          order_index?: number
          reminder_time?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          frequency?: string
          icon?: string
          id?: string
          is_active?: boolean
          linked_chapter_id?: string | null
          linked_insight_id?: string | null
          order_index?: number
          reminder_time?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rituals_linked_chapter_id_fkey"
            columns: ["linked_chapter_id"]
            isOneToOne: false
            referencedRelation: "growth_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      session_artifacts: {
        Row: {
          content: Json
          created_at: string
          format: string
          id: string
          session_id: string
          type: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          format?: string
          id?: string
          session_id: string
          type: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          format?: string
          id?: string
          session_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_artifacts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_messages: {
        Row: {
          content: string
          created_at: string
          emotion_tags: Json | null
          id: string
          insight_title: string | null
          is_insight: boolean
          meta: Json
          role: string
          session_id: string
          user_id: string
          voice_session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          emotion_tags?: Json | null
          id?: string
          insight_title?: string | null
          is_insight?: boolean
          meta?: Json
          role: string
          session_id: string
          user_id: string
          voice_session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          emotion_tags?: Json | null
          id?: string
          insight_title?: string | null
          is_insight?: boolean
          meta?: Json
          role?: string
          session_id?: string
          user_id?: string
          voice_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_messages_voice_session_id_fkey"
            columns: ["voice_session_id"]
            isOneToOne: false
            referencedRelation: "voice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_model_allowlist: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          is_default: boolean
          model_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          is_default?: boolean
          model_id: string
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          is_default?: boolean
          model_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          action_type: string
          count: number
          created_at: string
          date: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          count?: number
          created_at?: string
          date?: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          count?: number
          created_at?: string
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          metadata: Json | null
          provider: string
          provider_email: string | null
          refresh_token: string | null
          scopes: string[] | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          provider: string
          provider_email?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          provider?: string
          provider_email?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_model_preferences: {
        Row: {
          created_at: string
          preferred_chat_model: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          preferred_chat_model?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          preferred_chat_model?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_model_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_live_sessions: {
        Row: {
          coach_id: string | null
          created_at: string
          debited_mcredits: number
          finalized_at: string | null
          hold_mcredits: number
          id: string
          model_id: string
          session_id: string | null
          started_at: string
          status: string
          updated_at: string
          usage_units: Json
          user_id: string
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          debited_mcredits?: number
          finalized_at?: string | null
          hold_mcredits: number
          id?: string
          model_id: string
          session_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          usage_units?: Json
          user_id: string
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          debited_mcredits?: number
          finalized_at?: string | null
          hold_mcredits?: number
          id?: string
          model_id?: string
          session_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          usage_units?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_live_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_live_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_live_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_sessions: {
        Row: {
          coach_id: string
          created_at: string | null
          duration_seconds: number
          emotion_tags: Json
          id: string
          session_id: string | null
          status: string
          transcript: string | null
          updated_at: string | null
          user_id: string
          voice_name: string
          word_count: number
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          duration_seconds?: number
          emotion_tags?: Json
          id?: string
          session_id?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string | null
          user_id: string
          voice_name?: string
          word_count?: number
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          duration_seconds?: number
          emotion_tags?: Json
          id?: string
          session_id?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string | null
          user_id?: string
          voice_name?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "voice_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_preferences: {
        Row: {
          created_at: string | null
          daily_focus_enabled: boolean
          id: string
          preferred_coach_id: string | null
          quick_coach_enabled: boolean
          reflection_enabled: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_focus_enabled?: boolean
          id?: string
          preferred_coach_id?: string | null
          quick_coach_enabled?: boolean
          reflection_enabled?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_focus_enabled?: boolean
          id?: string
          preferred_coach_id?: string | null
          quick_coach_enabled?: boolean
          reflection_enabled?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      coachgenie_can_manage_custom_coaches: {
        Args: { p_user: string }
        Returns: boolean
      }
      credit_apply_delta: {
        Args: { p_delta: number; p_user_id: string }
        Returns: number
      }
      increment_collection_count: {
        Args: { collection_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
