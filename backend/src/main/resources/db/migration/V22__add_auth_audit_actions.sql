-- Flyway Migration: Add user_registered, user_login_success, user_login_failed to audit_action_enum
ALTER TYPE audit_action_enum ADD VALUE 'user_registered';
ALTER TYPE audit_action_enum ADD VALUE 'user_login_success';
ALTER TYPE audit_action_enum ADD VALUE 'user_login_failed';
