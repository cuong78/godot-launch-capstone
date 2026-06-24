-- Flyway Migration: Add user_logged_out to audit_action_enum
ALTER TYPE audit_action_enum ADD VALUE 'user_logged_out';
