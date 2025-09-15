-- Exercise sessions
CREATE TABLE exercise_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    exercises_completed INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0
);

-- Individual exercise results
CREATE TABLE exercise_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL,
    exercise_type VARCHAR(50) NOT NULL CHECK (
        exercise_type IN ('visual_discrimination', 'term_matching', 'contextual_fill', 'image_labeling')
    ),
    annotation_id UUID REFERENCES annotations(id),
    spanish_term VARCHAR(200),
    user_answer JSONB,
    is_correct BOOLEAN NOT NULL,
    time_taken INTEGER, -- milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sessions_session_id ON exercise_sessions(session_id);
CREATE INDEX idx_results_session ON exercise_results(session_id);
CREATE INDEX idx_results_type ON exercise_results(exercise_type);
CREATE INDEX idx_results_correct ON exercise_results(is_correct);
CREATE INDEX idx_results_term ON exercise_results(spanish_term);