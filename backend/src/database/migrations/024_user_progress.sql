-- User term progress for Spaced Repetition System (SM-2 algorithm)
CREATE TABLE IF NOT EXISTS user_term_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  term_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  -- SM-2 algorithm fields
  repetitions INTEGER DEFAULT 0,
  ease_factor DECIMAL(4,2) DEFAULT 2.5 CHECK (ease_factor >= 1.3),
  interval_days INTEGER DEFAULT 1,
  next_review_at TIMESTAMP WITH TIME ZONE,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  -- Statistics
  times_correct INTEGER DEFAULT 0,
  times_incorrect INTEGER DEFAULT 0,
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),
  -- Timestamps
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, term_id)
);

-- User learning sessions for analytics
CREATE TABLE IF NOT EXISTS user_learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('learn', 'practice', 'review')),
  module_id UUID REFERENCES learning_modules(id),
  terms_learned INTEGER DEFAULT 0,
  terms_reviewed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for SRS queries
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_term_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_review ON user_term_progress(user_id, next_review_at)
  WHERE next_review_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_learning_sessions(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_term_progress_updated_at
BEFORE UPDATE ON user_term_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
