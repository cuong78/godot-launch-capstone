-- V45: Add Google Play Mock Report and Revenue Share Tables

-- 1. Extend external_publishes table
ALTER TABLE external_publishes
    ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'GOOGLE_PLAY_MOCK',
    ADD COLUMN IF NOT EXISTS package_name VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS reporting_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS mock_registration_id VARCHAR(100);

-- 2. Create store_report_imports table
CREATE TABLE IF NOT EXISTS store_report_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE_PLAY_MOCK',
    external_publish_id UUID NOT NULL REFERENCES external_publishes(id) ON DELETE CASCADE,
    source_object_path TEXT,
    report_month VARCHAR(50),
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw_file_url TEXT,
    file_checksum VARCHAR(64),
    row_count INT DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'succeeded',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_store_report_imports_publish ON store_report_imports(external_publish_id);
CREATE INDEX IF NOT EXISTS idx_store_report_imports_synced ON store_report_imports(synced_at);

-- 3. Create store_daily_install_metrics table
CREATE TABLE IF NOT EXISTS store_daily_install_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_publish_id UUID NOT NULL REFERENCES external_publishes(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    daily_user_installs INT NOT NULL DEFAULT 0,
    source_import_id UUID REFERENCES store_report_imports(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_store_daily_metrics UNIQUE (external_publish_id, metric_date, country_code)
);

CREATE INDEX IF NOT EXISTS idx_store_daily_metrics_game_date ON store_daily_install_metrics(game_id, metric_date);

-- 4. Create store_revenue_statements table
CREATE TABLE IF NOT EXISTS store_revenue_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_publish_id UUID NOT NULL REFERENCES external_publishes(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'GOOGLE_PLAY_MOCK',
    period_key VARCHAR(50) NOT NULL,
    external_payout_id VARCHAR(100) NOT NULL UNIQUE,
    gross_revenue NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    google_fee_rate NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    google_fee_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    net_store_proceeds NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    developer_share_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    developer_earnings NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    platform_retained_revenue NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    status VARCHAR(20) NOT NULL DEFAULT 'paid',
    settled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_store_revenue_statements_game ON store_revenue_statements(game_id);
