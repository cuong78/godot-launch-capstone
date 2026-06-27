-- Flyway Migration: Remove license and license_terms columns from marketplace_items table
ALTER TABLE marketplace_items DROP COLUMN IF EXISTS license;
ALTER TABLE marketplace_items DROP COLUMN IF EXISTS license_terms;
