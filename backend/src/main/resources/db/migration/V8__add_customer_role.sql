-- 1. Insert 'customer' role if it does not exist
INSERT INTO roles (name, description)
SELECT 'customer', 'Khách hàng — xem và mua game, asset, tham gia cộng đồng'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'customer');

-- 2. Update users carrying the old 'player' or 'guest' roles to 'customer'
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'customer')
WHERE role_id IN (SELECT id FROM roles WHERE name IN ('player', 'guest'));

-- 3. Delete 'player' and 'guest' roles from roles table
DELETE FROM roles WHERE name IN ('player', 'guest');

-- 4. Re-create actor_role_enum (excluding 'player', 'system', 'guest', including 'customer')
ALTER TYPE actor_role_enum RENAME TO actor_role_enum_old;
CREATE TYPE actor_role_enum AS ENUM ('developer', 'admin', 'customer');

-- 5. Alter audit_logs to use the new enum, mapping any old values to customer
ALTER TABLE audit_logs 
  ALTER COLUMN actor_role TYPE actor_role_enum 
  USING (
    CASE 
      WHEN actor_role::text IN ('player', 'system', 'guest') THEN 'customer'::actor_role_enum
      ELSE actor_role::text::actor_role_enum
    END
  );

DROP TYPE actor_role_enum_old;
