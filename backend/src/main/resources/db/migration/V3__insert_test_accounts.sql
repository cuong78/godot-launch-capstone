-- ============================================================
--  Migration V3: Insert test accounts (Admin, Developers, Players)
-- ============================================================

-- Insert Admin Account (username: admin, password: admin123)
INSERT INTO users (role_id, email, username, password_hash, full_name, status)
VALUES (
    (SELECT id FROM roles WHERE name = 'admin' LIMIT 1),
    'admin@godotlaunch.com',
    'admin',
    '$2a$10$L9gWApeAmIUqeoS3QkNO5uhTwYQGNe.xHdVdoHMsxO1oHK6rYfnl6',
    'Administrator',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- Insert Developer Accounts (username: dev1, dev2, password: developer123)
INSERT INTO users (role_id, email, username, password_hash, full_name, status)
VALUES (
    (SELECT id FROM roles WHERE name = 'developer' LIMIT 1),
    'dev1@godotlaunch.com',
    'dev1',
    '$2a$10$e/gDIX.wMJxAQEXZ0HvTa.954RQPiuzuTueaQaPsqgTFPF8PTxsba',
    'Developer One',
    'active'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (role_id, email, username, password_hash, full_name, status)
VALUES (
    (SELECT id FROM roles WHERE name = 'developer' LIMIT 1),
    'dev2@godotlaunch.com',
    'dev2',
    '$2a$10$e/gDIX.wMJxAQEXZ0HvTa.954RQPiuzuTueaQaPsqgTFPF8PTxsba',
    'Developer Two',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- Insert Player Accounts (username: user1, user2, password: player123)
INSERT INTO users (role_id, email, username, password_hash, full_name, status)
VALUES (
    (SELECT id FROM roles WHERE name = 'player' LIMIT 1),
    'user1@godotlaunch.com',
    'user1',
    '$2a$10$GBQHGtIS4SFuBkyZXG1BVeOooQPVnv9751jZenAPtZuRnnBVzAYGS',
    'Player One',
    'active'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (role_id, email, username, password_hash, full_name, status)
VALUES (
    (SELECT id FROM roles WHERE name = 'player' LIMIT 1),
    'user2@godotlaunch.com',
    'user2',
    '$2a$10$GBQHGtIS4SFuBkyZXG1BVeOooQPVnv9751jZenAPtZuRnnBVzAYGS',
    'Player Two',
    'active'
) ON CONFLICT (email) DO NOTHING;
