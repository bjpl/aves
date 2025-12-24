-- Migration 012: Create Annotation History Table
-- Created: 2025-12-14
-- Purpose: Track all changes to annotations for version control and audit trail

-- ============================================================================
-- ANNOTATION_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS annotation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,

    -- Track what changed
    previous_values JSONB NOT NULL,
    new_values JSONB NOT NULL,

    -- Track who changed it and when
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Change metadata
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('create', 'update', 'delete', 'approve', 'reject')),
    change_notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_annotation_history_annotation_id ON annotation_history(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_history_changed_at ON annotation_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_annotation_history_changed_by ON annotation_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_annotation_history_change_type ON annotation_history(change_type);

-- ============================================================================
-- TRIGGER FUNCTION: Record annotation changes automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION record_annotation_change()
RETURNS TRIGGER AS $$
DECLARE
    prev_values JSONB;
    new_vals JSONB;
    change_type_val VARCHAR(20);
    changed_by_id UUID;
BEGIN
    -- Determine change type
    IF TG_OP = 'INSERT' THEN
        change_type_val := 'create';
        prev_values := '{}'::jsonb;
        new_vals := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        change_type_val := 'update';
        prev_values := to_jsonb(OLD);
        new_vals := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        change_type_val := 'delete';
        prev_values := to_jsonb(OLD);
        new_vals := '{}'::jsonb;
    END IF;

    -- Try to get user ID from current session (if set by application)
    BEGIN
        changed_by_id := current_setting('app.current_user_id', true)::uuid;
    EXCEPTION WHEN OTHERS THEN
        changed_by_id := NULL;
    END;

    -- Insert history record
    INSERT INTO annotation_history (
        annotation_id,
        previous_values,
        new_values,
        changed_by,
        change_type
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        prev_values,
        new_vals,
        changed_by_id,
        change_type_val
    );

    -- Return appropriate value based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Automatically record changes to annotations table
-- ============================================================================

-- Record all INSERT operations
CREATE TRIGGER trigger_annotation_history_insert
    AFTER INSERT ON annotations
    FOR EACH ROW
    EXECUTE FUNCTION record_annotation_change();

-- Record all UPDATE operations
CREATE TRIGGER trigger_annotation_history_update
    AFTER UPDATE ON annotations
    FOR EACH ROW
    EXECUTE FUNCTION record_annotation_change();

-- Record all DELETE operations
CREATE TRIGGER trigger_annotation_history_delete
    AFTER DELETE ON annotations
    FOR EACH ROW
    EXECUTE FUNCTION record_annotation_change();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE annotation_history IS 'Version control and audit trail for all annotation changes';
COMMENT ON COLUMN annotation_history.previous_values IS 'Complete annotation state before the change (JSONB)';
COMMENT ON COLUMN annotation_history.new_values IS 'Complete annotation state after the change (JSONB)';
COMMENT ON COLUMN annotation_history.changed_by IS 'User who made the change (NULL for system changes)';
COMMENT ON COLUMN annotation_history.change_type IS 'Type of change: create, update, delete, approve, reject';

-- ============================================================================
-- HELPER FUNCTION: Get formatted history for an annotation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_annotation_history(p_annotation_id UUID)
RETURNS TABLE (
    id UUID,
    changed_at TIMESTAMP WITH TIME ZONE,
    changed_by_email VARCHAR(255),
    change_type VARCHAR(20),
    changes_summary TEXT,
    previous_values JSONB,
    new_values JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ah.id,
        ah.changed_at,
        u.email as changed_by_email,
        ah.change_type,
        CASE
            WHEN ah.change_type = 'create' THEN 'Annotation created'
            WHEN ah.change_type = 'delete' THEN 'Annotation deleted'
            WHEN ah.change_type = 'approve' THEN 'Annotation approved'
            WHEN ah.change_type = 'reject' THEN 'Annotation rejected'
            ELSE format('Updated: %s field(s)',
                (SELECT COUNT(*) FROM jsonb_each(ah.new_values)
                 WHERE ah.new_values->key IS DISTINCT FROM ah.previous_values->key)
            )
        END as changes_summary,
        ah.previous_values,
        ah.new_values
    FROM annotation_history ah
    LEFT JOIN users u ON ah.changed_by = u.id
    WHERE ah.annotation_id = p_annotation_id
    ORDER BY ah.changed_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_annotation_history IS 'Retrieve formatted history for a specific annotation with user details';
