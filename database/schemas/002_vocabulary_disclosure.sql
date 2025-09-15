-- Vocabulary mastery tracking
CREATE TABLE vocabulary_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Will reference users table when auth is implemented
    annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
    spanish_term VARCHAR(200) NOT NULL,
    disclosure_level INTEGER DEFAULT 0 CHECK (disclosure_level BETWEEN 0 AND 4),
    view_count INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in seconds
    last_viewed TIMESTAMP WITH TIME ZONE,
    first_viewed TIMESTAMP WITH TIME ZONE,
    mastery_score DECIMAL(3,2) DEFAULT 0.00 CHECK (mastery_score BETWEEN 0 AND 1),
    next_review_date DATE,
    review_interval INTEGER DEFAULT 1, -- days
    ease_factor DECIMAL(3,2) DEFAULT 2.50,
    repetition_number INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, annotation_id)
);

-- Learning events for analytics
CREATE TABLE learning_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN ('hover', 'click', 'audio_play', 'exercise_complete', 'review')
    ),
    disclosure_level INTEGER CHECK (disclosure_level BETWEEN 0 AND 4),
    interaction_duration INTEGER, -- milliseconds
    correct_response BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Etymology and related terms cache
CREATE TABLE vocabulary_enrichment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spanish_term VARCHAR(200) UNIQUE NOT NULL,
    etymology TEXT,
    mnemonic TEXT,
    related_terms JSONB, -- Array of {term, relationship, definition}
    common_phrases JSONB, -- Array of {spanish, english, literal}
    usage_examples JSONB, -- Array of example sentences
    difficulty_score DECIMAL(3,2),
    frequency_rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User learning preferences
CREATE TABLE learning_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE,
    preferred_disclosure_speed VARCHAR(20) DEFAULT 'normal'
        CHECK (preferred_disclosure_speed IN ('slow', 'normal', 'fast')),
    auto_play_audio BOOLEAN DEFAULT false,
    show_etymology BOOLEAN DEFAULT true,
    show_mnemonics BOOLEAN DEFAULT true,
    daily_review_goal INTEGER DEFAULT 10,
    notification_enabled BOOLEAN DEFAULT true,
    notification_time TIME DEFAULT '09:00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_mastery_user ON vocabulary_mastery(user_id);
CREATE INDEX idx_mastery_annotation ON vocabulary_mastery(annotation_id);
CREATE INDEX idx_mastery_next_review ON vocabulary_mastery(next_review_date);
CREATE INDEX idx_mastery_score ON vocabulary_mastery(mastery_score);
CREATE INDEX idx_events_user_annotation ON learning_events(user_id, annotation_id);
CREATE INDEX idx_events_type ON learning_events(event_type);
CREATE INDEX idx_events_created ON learning_events(created_at);
CREATE INDEX idx_enrichment_term ON vocabulary_enrichment(spanish_term);

-- Trigger for updating vocabulary mastery
CREATE OR REPLACE FUNCTION update_vocabulary_mastery()
RETURNS TRIGGER AS $$
DECLARE
    v_mastery_id UUID;
    v_view_count INTEGER;
    v_total_time INTEGER;
    v_correct_count INTEGER;
    v_total_exercises INTEGER;
    v_days_since_first DECIMAL;
    v_new_score DECIMAL(3,2);
BEGIN
    -- Find or create mastery record
    SELECT id, view_count, total_time_spent
    INTO v_mastery_id, v_view_count, v_total_time
    FROM vocabulary_mastery
    WHERE user_id = NEW.user_id AND annotation_id = NEW.annotation_id;

    IF v_mastery_id IS NULL THEN
        INSERT INTO vocabulary_mastery (user_id, annotation_id, spanish_term, first_viewed, last_viewed, view_count)
        SELECT NEW.user_id, NEW.annotation_id, a.spanish_term, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1
        FROM annotations a
        WHERE a.id = NEW.annotation_id
        RETURNING id INTO v_mastery_id;
    ELSE
        -- Update interaction counts
        UPDATE vocabulary_mastery
        SET
            view_count = view_count + 1,
            total_time_spent = total_time_spent + COALESCE(NEW.interaction_duration / 1000, 0),
            last_viewed = CURRENT_TIMESTAMP,
            disclosure_level = GREATEST(disclosure_level, NEW.disclosure_level)
        WHERE id = v_mastery_id;
    END IF;

    -- Calculate mastery score
    SELECT
        view_count,
        total_time_spent,
        COUNT(CASE WHEN event_type = 'exercise_complete' AND correct_response = true THEN 1 END),
        COUNT(CASE WHEN event_type = 'exercise_complete' THEN 1 END),
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - first_viewed))
    INTO v_view_count, v_total_time, v_correct_count, v_total_exercises, v_days_since_first
    FROM vocabulary_mastery vm
    LEFT JOIN learning_events le ON le.annotation_id = vm.annotation_id AND le.user_id = vm.user_id
    WHERE vm.id = v_mastery_id
    GROUP BY vm.id, vm.view_count, vm.total_time_spent, vm.first_viewed;

    -- Calculate weighted mastery score
    v_new_score := LEAST(1.0, (
        LEAST(v_view_count * 0.05, 0.2) + -- View factor (max 20%)
        LEAST(v_total_time / 300.0 * 0.2, 0.2) + -- Time factor (5 min = 20%)
        CASE
            WHEN v_total_exercises > 0
            THEN (v_correct_count::DECIMAL / v_total_exercises) * 0.4
            ELSE 0
        END + -- Exercise performance (40%)
        LEAST(v_days_since_first * 0.02, 0.2) -- Retention over time (max 20%)
    ));

    UPDATE vocabulary_mastery
    SET mastery_score = v_new_score
    WHERE id = v_mastery_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for learning events
CREATE TRIGGER update_mastery_on_event
AFTER INSERT ON learning_events
FOR EACH ROW
EXECUTE FUNCTION update_vocabulary_mastery();

-- Update triggers for timestamp updates
CREATE TRIGGER update_vocabulary_mastery_updated_at
BEFORE UPDATE ON vocabulary_mastery
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vocabulary_enrichment_updated_at
BEFORE UPDATE ON vocabulary_enrichment
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_preferences_updated_at
BEFORE UPDATE ON learning_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();