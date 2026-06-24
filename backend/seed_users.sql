-- Đảm bảo client đọc đúng UTF-8 (tiếng Việt có dấu)
SET client_encoding TO 'UTF8';

-- ============================================================
--  SEED DATA — 5 customer + 5 developer (data ảo để test)
--  Mật khẩu chung cho TẤT CẢ: Password123!
--  BCrypt cost 12 — khớp với BCryptPasswordEncoder của backend.
--
--  Chạy thủ công (KHÔNG phải Flyway migration):
--    psql -h localhost -U user_godot_launch -d godot_launch -f backend/seed_users.sql
--  hoặc:
--    docker exec -i godotlaunch-postgres psql -U user_godot_launch -d godot_launch < backend/seed_users.sql
--
--  Idempotent: ON CONFLICT (email) DO NOTHING — chạy lại không tạo trùng.
-- ============================================================

INSERT INTO users (role_id, email, password_hash, full_name, status, face_verified)
VALUES
    -- ── 5 PLAYER ────────────────────────────────────────────
    ((SELECT id FROM roles WHERE name = 'customer'),
     'player1@godotlaunch.test',
     '$2b$12$UiNIibb8xogNa.S9HWs.XO6FepkrvVTdd7SNxNIdAirKRJvtqKJlW',
     'Nguyễn Văn An', 'active', FALSE),

    ((SELECT id FROM roles WHERE name = 'customer'),
     'player2@godotlaunch.test',
     '$2b$12$vAA/dQBfO2EbUhtSw3Re4uLqHM13.tv7jQnPCQwFpbISi4ltzT/nm',
     'Trần Thị Bình', 'active', FALSE),

    ((SELECT id FROM roles WHERE name = 'customer'),
     'player3@godotlaunch.test',
     '$2b$12$HyyNLdRb4I7KfkXQpM0gLuxO41RYro5QeLmvaN.SlrPt.SgPC678C',
     'Lê Hoàng Cường', 'active', FALSE),

    ((SELECT id FROM roles WHERE name = 'customer'),
     'player4@godotlaunch.test',
     '$2b$12$V.70IaUm4eCTP0TZLHT16On6SuTJ2QHXEXRfOKENg8xX4zRjHNYBW',
     'Phạm Minh Dương', 'active', FALSE),

    ((SELECT id FROM roles WHERE name = 'customer'),
     'player5@godotlaunch.test',
     '$2b$12$cAlrfdgtEbTlI4ey2frJoObN.ccUCGi4kNnQXhaxR12hplGWvTrkS',
     'Vũ Thị Hà', 'active', FALSE),

    -- ── 5 DEVELOPER ─────────────────────────────────────────
    -- dev1, dev2 đã face_verified = true (mô phỏng đã qua Tier 1)
    ((SELECT id FROM roles WHERE name = 'developer'),
     'dev1@godotlaunch.test',
     '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K',
     'Đặng Quốc Khánh', 'active', TRUE),

    ((SELECT id FROM roles WHERE name = 'developer'),
     'dev2@godotlaunch.test',
     '$2b$12$lOvRMiweYHKGHdx1suNDpOSoJKadlEV0BKWZ/u9uwPDJO2jjThF8a',
     'Bùi Thanh Lan', 'active', TRUE),

    ((SELECT id FROM roles WHERE name = 'developer'),
     'dev3@godotlaunch.test',
     '$2b$12$C2kt72CjZedgHK67eMlrD.uB2mnzgWVIhG1.BwqIXdASxmcUFpoua',
     'Hồ Đức Mạnh', 'active', FALSE),

    ((SELECT id FROM roles WHERE name = 'developer'),
     'dev4@godotlaunch.test',
     '$2b$12$qWz/x.2Q353UlFC6p.pOVO9.ajRX94IyCk2yA88Z3uLs95y46HdXy',
     'Đỗ Thị Ngọc', 'active', FALSE),

    ((SELECT id FROM roles WHERE name = 'developer'),
     'dev5@godotlaunch.test',
     '$2b$12$12xKzF7yBLJO2e7sBTxiSOQN/nGnoHzB9ViAGIEoEnP32ObLeXdAO',
     'Ngô Văn Phú', 'active', FALSE)
ON CONFLICT (email) DO NOTHING;

-- Kiểm tra kết quả
SELECT u.email, r.name AS role, u.full_name, u.status, u.face_verified
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.email LIKE '%@godotlaunch.test'
ORDER BY r.name, u.email;
