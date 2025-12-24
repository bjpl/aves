-- Set Admin Role for User
--
-- USAGE: Run this in Supabase SQL Editor to grant admin access
-- Replace 'your-email@example.com' with your actual email

-- Option 1: Set admin role via raw_user_meta_data (recommended for development)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'your-email@example.com';

-- Option 2: Set admin role via raw_app_metadata (alternative)
-- UPDATE auth.users
-- SET raw_app_metadata = jsonb_set(
--   COALESCE(raw_app_metadata, '{}'::jsonb),
--   '{role}',
--   '"admin"'::jsonb
-- )
-- WHERE email = 'your-email@example.com';

-- Verify the update
SELECT
  id,
  email,
  raw_user_meta_data->>'role' as user_role,
  raw_app_metadata->>'role' as app_role
FROM auth.users
WHERE email = 'your-email@example.com';
