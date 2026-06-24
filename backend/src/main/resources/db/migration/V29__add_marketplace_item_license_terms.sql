-- Flyway Migration: Add license_terms column to marketplace_items table
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS license_terms TEXT;
