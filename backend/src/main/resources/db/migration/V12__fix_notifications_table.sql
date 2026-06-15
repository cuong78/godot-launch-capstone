-- Drop the old mismatched notifications table
DROP TABLE IF EXISTS notifications CASCADE;

-- Recreate notifications table with correct schema matching the JPA Notification entity
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    target_id VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recreate indices for recipient and is_read queries
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(recipient_id, is_read);
