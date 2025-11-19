-- Migration 014: Annotation Mastery Tracking System
-- Created: 2025-11-19
-- Purpose: Track user progress and mastery for individual annotations with spaced repetition

-- ============================================================================
-- ANNOTATION_MASTERY TABLE
-- ============================================================================
-- Tracks individual user progress on each annotation for personalized learning

CREATE TABLE IF NOT EXISTS annotation_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL, -- User identifier (can be session-based or authenticated user)
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,

    -- Exposure tracking
    exposure_count INTEGER DEFAULT 0 CHECK (exposure_count >= 0),
    correct_count INTEGER DEFAULT 0 CHECK (correct_count >= 0 AND correct_count <= exposure_count),
    incorrect_count INTEGER DEFAULT 0 CHECK (incorrect_count >= 0),

    -- Temporal tracking for spaced repetition
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_correct_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE, -- Calculated based on spaced repetition algorithm

    -- Mastery metrics
    mastery_score DECIMAL(5,4) DEFAULT 0.0000 CHECK (mastery_score >= 0 AND mastery_score <= 1.0000),
    confidence_level INTEGER DEFAULT 1 CHECK (confidence_level BETWEEN 1 AND 5), -- 1=beginner, 5=mastered

    -- Performance tracking
    avg_response_time_ms INTEGER, -- Average time to answer correctly
    fastest_response_time_ms INTEGER,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint: one mastery record per user-annotation pair
    UNIQUE(user_id, annotation_id)
);

-- ============================================================================
-- EXERCISE_ANNOTATION_LINKS TABLE
-- ============================================================================
-- Explicitly links exercises to the annotations they use

CREATE TABLE IF NOT EXISTS exercise_annotation_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id VARCHAR(255) NOT NULL, -- Exercise identifier (may be ephemeral)
    session_id VARCHAR(255), -- Optional: link to exercise session
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,

    -- Role of annotation in exercise
    role VARCHAR(50) NOT NULL CHECK (role IN ('target', 'distractor', 'context', 'example')),

    -- Exercise metadata
    exercise_type VARCHAR(50) NOT NULL,
    was_correct BOOLEAN, -- NULL if exercise not yet completed

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Index for efficient queries
    INDEX idx_exercise_id (exercise_id),
    INDEX idx_session_id (session_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Query by user and mastery score (for finding weak annotations)
CREATE INDEX IF NOT EXISTS idx_annotation_mastery_user_score
    ON annotation_mastery(user_id, mastery_score);

-- Query by user and next review date (for spaced repetition)
CREATE INDEX IF NOT EXISTS idx_annotation_mastery_review
    ON annotation_mastery(user_id, next_review_at)
    WHERE next_review_at IS NOT NULL;

-- Query by annotation (for global statistics)
CREATE INDEX IF NOT EXISTS idx_annotation_mastery_annotation
    ON annotation_mastery(annotation_id);

-- Query by confidence level (for difficulty adaptation)
CREATE INDEX IF NOT EXISTS idx_annotation_mastery_confidence
    ON annotation_mastery(user_id, confidence_level);

-- Query exercise links by annotation
CREATE INDEX IF NOT EXISTS idx_exercise_links_annotation
    ON exercise_annotation_links(annotation_id);

-- Query exercise links by session
CREATE INDEX IF NOT EXISTS idx_exercise_links_session
    ON exercise_annotation_links(session_id)
    WHERE session_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp on annotation_mastery
CREATE OR REPLACE FUNCTION update_annotation_mastery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_annotation_mastery_updated_at
    BEFORE UPDATE ON annotation_mastery
    FOR EACH ROW
    EXECUTE FUNCTION update_annotation_mastery_updated_at();

-- Auto-calculate mastery score on update
CREATE OR REPLACE FUNCTION calculate_mastery_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate mastery score using weighted formula
    -- Recent performance weighted more heavily
    IF NEW.exposure_count > 0 THEN
        -- Base accuracy
        DECLARE
            accuracy DECIMAL(5,4);
            recency_bonus DECIMAL(5,4);
            streak_multiplier DECIMAL(5,4);
        BEGIN
            -- Base accuracy: correct / total
            accuracy := LEAST(1.0, NEW.correct_count::DECIMAL / NEW.exposure_count::DECIMAL);

            -- Recency bonus: higher score if recently correct
            IF NEW.last_correct_at IS NOT NULL THEN
                recency_bonus := LEAST(0.2, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.last_correct_at)) / (7 * 24 * 3600));
                recency_bonus := 0.2 - recency_bonus; -- Inverse: recent = higher bonus
            ELSE
                recency_bonus := 0.0;
            END IF;

            -- Streak multiplier: consecutive correct answers boost score
            IF NEW.incorrect_count = 0 AND NEW.correct_count >= 3 THEN
                streak_multiplier := 1.15; -- 15% boost for perfect streak
            ELSE
                streak_multiplier := 1.0;
            END IF;

            -- Combined formula
            NEW.mastery_score := LEAST(1.0, (accuracy * 0.7 + recency_bonus) * streak_multiplier);

            -- Update confidence level based on mastery score
            NEW.confidence_level :=
                CASE
                    WHEN NEW.mastery_score >= 0.9 THEN 5
                    WHEN NEW.mastery_score >= 0.75 THEN 4
                    WHEN NEW.mastery_score >= 0.5 THEN 3
                    WHEN NEW.mastery_score >= 0.25 THEN 2
                    ELSE 1
                END;
        END;
    ELSE
        NEW.mastery_score := 0.0;
        NEW.confidence_level := 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_mastery_score
    BEFORE INSERT OR UPDATE ON annotation_mastery
    FOR EACH ROW
    EXECUTE FUNCTION calculate_mastery_score();

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: User's weak annotations (for targeted practice)
CREATE OR REPLACE VIEW user_weak_annotations AS
SELECT
    am.user_id,
    am.annotation_id,
    a.spanish_term,
    a.english_term,
    a.annotation_type,
    a.difficulty_level,
    am.mastery_score,
    am.exposure_count,
    am.next_review_at
FROM annotation_mastery am
JOIN annotations a ON am.annotation_id = a.id
WHERE am.mastery_score < 0.7 -- Less than 70% mastery
ORDER BY am.mastery_score ASC, am.last_seen_at ASC;

-- View: Annotations due for review (spaced repetition)
CREATE OR REPLACE VIEW annotations_due_for_review AS
SELECT
    am.user_id,
    am.annotation_id,
    a.spanish_term,
    a.english_term,
    a.annotation_type,
    am.mastery_score,
    am.next_review_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - am.next_review_at)) / 3600 AS hours_overdue
FROM annotation_mastery am
JOIN annotations a ON am.annotation_id = a.id
WHERE am.next_review_at <= CURRENT_TIMESTAMP
ORDER BY am.next_review_at ASC;

-- View: Annotation mastery statistics (for analytics)
CREATE OR REPLACE VIEW annotation_statistics AS
SELECT
    a.id AS annotation_id,
    a.spanish_term,
    a.english_term,
    a.annotation_type,
    a.difficulty_level,
    COUNT(am.id) AS total_users,
    AVG(am.mastery_score) AS avg_mastery_score,
    AVG(am.exposure_count) AS avg_exposures,
    AVG(am.avg_response_time_ms) AS avg_response_time,
    COUNT(CASE WHEN am.mastery_score >= 0.8 THEN 1 END)::DECIMAL / COUNT(am.id) AS mastery_rate
FROM annotations a
LEFT JOIN annotation_mastery am ON a.id = am.annotation_id
GROUP BY a.id, a.spanish_term, a.english_term, a.annotation_type, a.difficulty_level;

-- ============================================================================
-- FUNCTIONS FOR SPACED REPETITION
-- ============================================================================

-- Calculate next review date using SuperMemo SM-2 algorithm (simplified)
CREATE OR REPLACE FUNCTION calculate_next_review_date(
    p_mastery_score DECIMAL,
    p_correct_count INTEGER,
    p_last_seen_at TIMESTAMP
) RETURNS TIMESTAMP AS $$
DECLARE
    interval_days DECIMAL;
    base_interval INTEGER := 1; -- 1 day
BEGIN
    -- SuperMemo SM-2 simplified algorithm
    -- Interval increases exponentially based on mastery and consecutive correct answers

    IF p_mastery_score >= 0.8 THEN
        -- High mastery: longer intervals
        interval_days := base_interval * POWER(2.5, LEAST(p_correct_count, 10));
    ELSIF p_mastery_score >= 0.5 THEN
        -- Medium mastery: moderate intervals
        interval_days := base_interval * POWER(1.8, LEAST(p_correct_count, 7));
    ELSE
        -- Low mastery: shorter intervals
        interval_days := base_interval * POWER(1.3, LEAST(p_correct_count, 5));
    END IF;

    -- Cap maximum interval at 90 days
    interval_days := LEAST(interval_days, 90);

    RETURN p_last_seen_at + (interval_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE annotation_mastery IS 'Tracks individual user mastery of annotations for personalized learning and spaced repetition';
COMMENT ON TABLE exercise_annotation_links IS 'Links exercises to the annotations they use, enabling annotation-driven analytics';

COMMENT ON COLUMN annotation_mastery.mastery_score IS 'Calculated score (0-1) representing user mastery of this annotation';
COMMENT ON COLUMN annotation_mastery.confidence_level IS 'Simplified 1-5 rating based on mastery score';
COMMENT ON COLUMN annotation_mastery.next_review_at IS 'Calculated timestamp for next spaced repetition review';

COMMENT ON VIEW user_weak_annotations IS 'Annotations with mastery score < 0.7, ordered by weakest first';
COMMENT ON VIEW annotations_due_for_review IS 'Annotations due for spaced repetition review';
COMMENT ON VIEW annotation_statistics IS 'Aggregate statistics for each annotation across all users';
