-- Add source_import_id column to store_revenue_statements table
ALTER TABLE store_revenue_statements 
ADD COLUMN IF NOT EXISTS source_import_id UUID REFERENCES store_report_imports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_store_revenue_statements_source_import ON store_revenue_statements(source_import_id);
