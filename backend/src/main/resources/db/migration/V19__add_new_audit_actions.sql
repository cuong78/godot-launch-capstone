-- Flyway Migration: Add post_created, comment_created, reaction_created, chat_message_sent to audit_action_enum
ALTER TYPE audit_action_enum ADD VALUE 'post_created';
ALTER TYPE audit_action_enum ADD VALUE 'comment_created';
ALTER TYPE audit_action_enum ADD VALUE 'reaction_created';
ALTER TYPE audit_action_enum ADD VALUE 'chat_message_sent';

-- Add chat_message to audit_target_enum
ALTER TYPE audit_target_enum ADD VALUE 'chat_message';
