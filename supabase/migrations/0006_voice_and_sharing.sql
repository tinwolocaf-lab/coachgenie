-- Create voice_sessions table
CREATE TABLE voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES coaching_sessions(id) ON DELETE SET NULL,
  coach_id TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  voice_name TEXT DEFAULT 'Kore',
  emotion_tags JSONB DEFAULT '[]'::jsonb,
  transcript TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create coach_shares table
CREATE TABLE coach_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT UNIQUE NOT NULL,
  coach_id TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_config JSONB NOT NULL,
  uses_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create widget_preferences table
CREATE TABLE widget_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_focus_enabled BOOLEAN DEFAULT true,
  quick_coach_enabled BOOLEAN DEFAULT true,
  reflection_enabled BOOLEAN DEFAULT true,
  preferred_coach_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns to session_messages table
ALTER TABLE session_messages
ADD COLUMN voice_session_id UUID REFERENCES voice_sessions(id) ON DELETE SET NULL,
ADD COLUMN emotion_tags JSONB DEFAULT NULL;

-- Enable RLS on new tables
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_sessions
CREATE POLICY voice_sessions_select_policy
  ON voice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY voice_sessions_insert_policy
  ON voice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY voice_sessions_update_policy
  ON voice_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for coach_shares
CREATE POLICY coach_shares_select_policy
  ON coach_shares FOR SELECT
  USING (true);

CREATE POLICY coach_shares_insert_policy
  ON coach_shares FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY coach_shares_update_policy
  ON coach_shares FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- RLS policies for widget_preferences
CREATE POLICY widget_preferences_select_policy
  ON widget_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY widget_preferences_insert_policy
  ON widget_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY widget_preferences_update_policy
  ON widget_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX voice_sessions_user_id_idx ON voice_sessions(user_id);
CREATE INDEX voice_sessions_session_id_idx ON voice_sessions(session_id);
CREATE INDEX coach_shares_share_id_idx ON coach_shares(share_id);
CREATE INDEX coach_shares_creator_id_idx ON coach_shares(creator_id);
