-- Flyway Migration: Add pending and rejected to item_status_enum
ALTER TYPE item_status_enum ADD VALUE 'pending';
ALTER TYPE item_status_enum ADD VALUE 'rejected';
