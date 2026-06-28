CREATE TABLE IF NOT EXISTS platform_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    announcement_banner TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (id, commission_rate, maintenance_mode, announcement_banner)
VALUES (1, 10.00, FALSE, 'GodotLaunch Matrix Engine Upgrade is complete!')
ON CONFLICT (id) DO NOTHING;
