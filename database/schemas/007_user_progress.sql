-- Migration 007: User Term Progress and Spaced Repetition
-- SPARC Specification: SRS system using SM-2 algorithm

-- ============================================
-- User Term Progress Table (SRS)
-- ============================================

CREATE TABLE user_term_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,

  -- SM-2 Algorithm Fields
  repetitions INTEGER NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  ease_factor DECIMAL(3,2) NOT NULL DEFAULT 2.5 CHECK (ease_factor >= 1.3),
  interval_days INTEGER NOT NULL DEFAULT 1 CHECK (interval_days > 0),

  -- Scheduling
  next_review_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Performance Tracking
  times_correct INTEGER NOT NULL DEFAULT 0 CHECK (times_correct >= 0),
  times_incorrect INTEGER NOT NULL DEFAULT 0 CHECK (times_incorrect >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),

  -- Mastery
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),

  -- Metadata
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(user_id, annotation_id),
  CONSTRAINT valid_review_count CHECK (times_correct + times_incorrect >= repetitions),
  CONSTRAINT streak_consistency CHECK (longest_streak >= current_streak)
);

-- ============================================
-- Review History Table (Audit Log)
-- ============================================

CREATE TABLE review_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,

  -- Review details
  quality INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 5),
  correct BOOLEAN NOT NULL,
  time_taken_ms INTEGER, -- milliseconds

  -- SRS state snapshot
  repetitions_before INTEGER NOT NULL,
  ease_factor_before DECIMAL(3,2) NOT NULL,
  interval_days_before INTEGER NOT NULL,
  mastery_level_before INTEGER NOT NULL,

  repetitions_after INTEGER NOT NULL,
  ease_factor_after DECIMAL(3,2) NOT NULL,
  interval_days_after INTEGER NOT NULL,
  mastery_level_after INTEGER NOT NULL,

  -- Timestamp
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- User term progress indexes
CREATE INDEX idx_user_progress_user ON user_term_progress(user_id);
CREATE INDEX idx_user_progress_annotation ON user_term_progress(annotation_id);
CREATE INDEX idx_user_progress_next_review ON user_term_progress(next_review_at);
CREATE INDEX idx_user_progress_mastery ON user_term_progress(mastery_level);

-- Composite indexes for common queries
CREATE INDEX idx_user_progress_user_review ON user_term_progress(user_id, next_review_at);
CREATE INDEX idx_user_progress_user_mastery ON user_term_progress(user_id, mastery_level);
CREATE INDEX idx_user_progress_due_terms ON user_term_progress(user_id, next_review_at)
  WHERE next_review_at <= CURRENT_TIMESTAMP;

-- Review history indexes
CREATE INDEX idx_review_history_user ON review_history(user_id);
CREATE INDEX idx_review_history_annotation ON review_history(annotation_id);
CREATE INDEX idx_review_history_reviewed_at ON review_history(reviewed_at);
CREATE INDEX idx_review_history_user_time ON review_history(user_id, reviewed_at DESC);

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON user_term_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update longest_streak
CREATE OR REPLACE FUNCTION update_longest_streak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_streak > OLD.longest_streak THEN
    NEW.longest_streak = NEW.current_streak;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_longest_streak
BEFORE UPDATE ON user_term_progress
FOR EACH ROW
EXECUTE FUNCTION update_longest_streak();

-- Auto-create review history on updates
CREATE OR REPLACE FUNCTION log_review_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if review actually happened (repetitions increased)
  IF NEW.repetitions > OLD.repetitions THEN
    INSERT INTO review_history (
      user_id,
      annotation_id,
      quality,
      correct,
      repetitions_before,
      ease_factor_before,
      interval_days_before,
      mastery_level_before,
      repetitions_after,
      ease_factor_after,
      interval_days_after,
      mastery_level_after,
      reviewed_at
    ) VALUES (
      NEW.user_id,
      NEW.annotation_id,
      -- Quality inferred from mastery change (approximate)
      CASE
        WHEN (NEW.mastery_level - OLD.mastery_level) >= 25 THEN 5
        WHEN (NEW.mastery_level - OLD.mastery_level) >= 15 THEN 4
        WHEN (NEW.mastery_level - OLD.mastery_level) >= 0 THEN 3
        WHEN (NEW.mastery_level - OLD.mastery_level) >= -10 THEN 2
        ELSE 1
      END,
      -- Correct inferred from mastery change
      (NEW.mastery_level >= OLD.mastery_level),
      OLD.repetitions,
      OLD.ease_factor,
      OLD.interval_days,
      OLD.mastery_level,
      NEW.repetitions,
      NEW.ease_factor,
      NEW.interval_days,
      NEW.mastery_level,
      CURRENT_TIMESTAMP
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_review_history
AFTER UPDATE ON user_term_progress
FOR EACH ROW
EXECUTE FUNCTION log_review_history();

-- ============================================
-- Helper Functions
-- ============================================

-- Function: Get due terms for a user
CREATE OR REPLACE FUNCTION get_due_terms(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  annotation_id UUID,
  spanish_term VARCHAR,
  english_term VARCHAR,
  next_review_at TIMESTAMP WITH TIME ZONE,
  mastery_level INTEGER,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.spanish_term,
    a.english_term,
    utp.next_review_at,
    utp.mastery_level,
    GREATEST(0, EXTRACT(DAY FROM (CURRENT_TIMESTAMP - utp.next_review_at))::INTEGER) as days_overdue
  FROM user_term_progress utp
  JOIN annotations a ON a.id = utp.annotation_id
  WHERE utp.user_id = p_user_id
    AND utp.next_review_at <= CURRENT_TIMESTAMP
  ORDER BY utp.next_review_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user progress stats
CREATE OR REPLACE FUNCTION get_user_progress_stats(p_user_id UUID)
RETURNS TABLE (
  total_terms BIGINT,
  mastered_terms BIGINT,
  learning_terms BIGINT,
  due_terms BIGINT,
  overdue_terms BIGINT,
  average_mastery NUMERIC,
  current_streak INTEGER,
  longest_streak INTEGER,
  total_reviews BIGINT,
  accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_terms,
    COUNT(*) FILTER (WHERE mastery_level >= 80) as mastered_terms,
    COUNT(*) FILTER (WHERE mastery_level < 80) as learning_terms,
    COUNT(*) FILTER (WHERE next_review_at <= CURRENT_TIMESTAMP) as due_terms,
    COUNT(*) FILTER (WHERE next_review_at <= CURRENT_TIMESTAMP - INTERVAL '1 day') as overdue_terms,
    ROUND(AVG(mastery_level), 2) as average_mastery,
    MAX(current_streak) as current_streak,
    MAX(longest_streak) as longest_streak,
    SUM(times_correct + times_incorrect) as total_reviews,
    CASE
      WHEN SUM(times_correct + times_incorrect) > 0
      THEN ROUND((SUM(times_correct)::NUMERIC / SUM(times_correct + times_incorrect)) * 100, 2)
      ELSE 0
    END as accuracy
  FROM user_term_progress
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Useful Views
-- ============================================

-- View: User progress summary
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT
  user_id,
  COUNT(*) as total_terms,
  COUNT(*) FILTER (WHERE mastery_level >= 80) as mastered_terms,
  COUNT(*) FILTER (WHERE next_review_at <= CURRENT_TIMESTAMP) as due_terms,
  AVG(mastery_level) as avg_mastery,
  MAX(current_streak) as best_streak,
  SUM(times_correct + times_incorrect) as total_reviews
FROM user_term_progress
GROUP BY user_id;

-- View: Overdue terms requiring attention
CREATE OR REPLACE VIEW overdue_terms AS
SELECT
  utp.user_id,
  utp.annotation_id,
  a.spanish_term,
  a.english_term,
  utp.next_review_at,
  utp.mastery_level,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - utp.next_review_at))::INTEGER as days_overdue
FROM user_term_progress utp
JOIN annotations a ON a.id = utp.annotation_id
WHERE utp.next_review_at <= CURRENT_TIMESTAMP - INTERVAL '1 day'
ORDER BY days_overdue DESC;

-- ============================================
-- Sample Data (Optional for Development)
-- ============================================

-- Uncomment to insert sample progress for testing
-- Note: Requires valid user_id and annotation_id
/*
INSERT INTO user_term_progress (user_id, annotation_id, repetitions, ease_factor, interval_days, next_review_at, mastery_level)
VALUES
  ('user-uuid-here', 'annotation-uuid-1', 0, 2.5, 1, CURRENT_TIMESTAMP + INTERVAL '1 day', 10),
  ('user-uuid-here', 'annotation-uuid-2', 1, 2.5, 6, CURRENT_TIMESTAMP - INTERVAL '1 day', 30),
  ('user-uuid-here', 'annotation-uuid-3', 3, 2.6, 15, CURRENT_TIMESTAMP + INTERVAL '5 days', 60);
*/

-- ============================================
-- Rollback (if needed)
-- ============================================

-- To rollback this migration, run:
-- DROP VIEW IF EXISTS overdue_terms;
-- DROP VIEW IF EXISTS user_progress_summary;
-- DROP FUNCTION IF EXISTS get_user_progress_stats(UUID);
-- DROP FUNCTION IF EXISTS get_due_terms(UUID, INTEGER);
-- DROP TRIGGER IF EXISTS trigger_log_review_history ON user_term_progress;
-- DROP FUNCTION IF EXISTS log_review_history();
-- DROP TRIGGER IF EXISTS trigger_update_longest_streak ON user_term_progress;
-- DROP FUNCTION IF EXISTS update_longest_streak();
-- DROP TABLE IF EXISTS review_history CASCADE;
-- DROP TABLE IF EXISTS user_term_progress CASCADE;
