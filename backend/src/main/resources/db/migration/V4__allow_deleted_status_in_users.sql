-- ============================================================
--  Migration V4: Allow 'deleted' status in users table for soft delete
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive', 'banned', 'deleted'));
