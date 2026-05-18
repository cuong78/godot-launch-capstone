-- ============================================================
--  Migration V2: Add username to users table
-- ============================================================

ALTER TABLE users ADD COLUMN username CITEXT NOT NULL UNIQUE;

CREATE INDEX idx_users_username ON users(username);

COMMENT ON COLUMN users.username IS 'CITEXT: Ten dang nhap duy nhat, khong phan biet hoa/thuong';
