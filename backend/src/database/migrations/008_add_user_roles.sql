-- Add role-based access control to users table
-- Migration: 008_add_user_roles

-- Add role column with default 'user'
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Add constraint to validate role values
ALTER TABLE users
ADD CONSTRAINT check_valid_role
CHECK (role IN ('user', 'admin', 'moderator'));

-- Create index for role lookups (improves performance for admin checks)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Set any existing users with NULL role to 'user'
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Make role NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.role IS 'User role for access control: user (default), admin (full access), moderator (limited admin access)';

-- Optional: Promote specific users to admin
-- To promote a user to admin after migration:
-- UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';

-- Optional: Create a function to safely change user roles
CREATE OR REPLACE FUNCTION change_user_role(user_email VARCHAR, new_role VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate role
  IF new_role NOT IN ('user', 'admin', 'moderator') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be user, admin, or moderator', new_role;
  END IF;

  -- Update user role
  UPDATE users
  SET role = new_role, updated_at = CURRENT_TIMESTAMP
  WHERE email = user_email;

  -- Return success if row was updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add permission checking function for app usage
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, required_role VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = user_id;

  -- Admin has all permissions
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Moderator has admin-level permissions except user management
  IF user_role = 'moderator' AND required_role IN ('moderator', 'user') THEN
    RETURN TRUE;
  END IF;

  -- User only has user-level permissions
  IF user_role = 'user' AND required_role = 'user' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create view for user roles (useful for admin UI)
CREATE OR REPLACE VIEW user_roles_summary AS
SELECT
  role,
  COUNT(*) as user_count,
  MIN(created_at) as first_user_created,
  MAX(created_at) as latest_user_created
FROM users
GROUP BY role;

COMMENT ON VIEW user_roles_summary IS 'Summary statistics of user roles';
