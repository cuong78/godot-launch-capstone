DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
    id           UUID         PRIMARY KEY,
    recipient_id UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(50)  NOT NULL,
    message      TEXT         NOT NULL,
    target_id    VARCHAR(255),
    is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read   ON notifications(recipient_id, is_read);
