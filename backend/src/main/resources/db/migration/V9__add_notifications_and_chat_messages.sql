-- V9: notifications moved to V1, chat_messages added here
-- notifications table already exists from V1 with correct schema

CREATE TABLE IF NOT EXISTS chat_messages (
    id           UUID    PRIMARY KEY,
    sender_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content      TEXT    NOT NULL,
    is_read      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at   ON chat_messages(created_at);
