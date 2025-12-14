-- Migration 022: Publish seeded annotations
-- Purpose: Set published_at timestamp on existing seeded annotations to make them visible in Learn/Practice features
-- This enables the content pipeline to work end-to-end

-- Publish all visible annotations that haven't been published yet
-- Note: The annotations table doesn't have a 'status' column - we use is_visible and published_at
UPDATE annotations
SET published_at = CURRENT_TIMESTAMP
WHERE is_visible = true
  AND published_at IS NULL;

-- Log the count of published annotations
DO $$
DECLARE
  published_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO published_count
  FROM annotations
  WHERE published_at IS NOT NULL;

  RAISE NOTICE 'Total published annotations: %', published_count;
END $$;
