-- Flyway migration to drop PostgreSQL audit_logs table
-- Since the audit log module is being migrated to MongoDB

DROP TABLE IF EXISTS audit_logs CASCADE;
