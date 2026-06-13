-- 1. Insert 'customer' role into roles table
INSERT INTO roles (name, description) VALUES ('customer', 'Khách hàng — xem và mua game, asset, tham gia cộng đồng');

-- 2. Update users carrying the old 'player' role to 'customer'
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'customer')
WHERE role_id = (SELECT id FROM roles WHERE name = 'player');

-- 3. Delete the 'player' role from the roles table
DELETE FROM roles WHERE name = 'player';

-- 4. Re-create actor_role_enum (excluding 'player' and 'system', including 'customer')
ALTER TYPE actor_role_enum RENAME TO actor_role_enum_old;
CREATE TYPE actor_role_enum AS ENUM ('developer', 'admin', 'customer');

-- 5. Alter audit_logs to use the new enum, mapping old player/system to customer
ALTER TABLE audit_logs 
  ALTER COLUMN actor_role TYPE actor_role_enum 
  USING (
    CASE 
      WHEN actor_role::text IN ('player', 'system') THEN 'customer'::actor_role_enum
      ELSE actor_role::text::actor_role_enum
    END
  );

DROP TYPE actor_role_enum_old;
