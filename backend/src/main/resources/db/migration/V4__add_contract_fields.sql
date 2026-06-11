-- Flyway Migration: Add missing contract fields
-- V4__add_contract_fields.sql

ALTER TABLE contracts ADD COLUMN lump_sum_amount VARCHAR(255);
ALTER TABLE contracts ADD COLUMN dispute_resolution_clause TEXT;
ALTER TABLE contracts ADD COLUMN additional_terms TEXT;
ALTER TABLE contracts ADD COLUMN buyer_representative VARCHAR(255);
ALTER TABLE contracts ADD COLUMN buyer_position VARCHAR(255);
ALTER TABLE contracts ADD COLUMN seller_representative VARCHAR(255);
ALTER TABLE contracts ADD COLUMN seller_address TEXT;
ALTER TABLE contracts ADD COLUMN seller_tax_code VARCHAR(100);
ALTER TABLE contracts ADD COLUMN seller_signature_base64 TEXT;
ALTER TABLE contracts ADD COLUMN buyer_signature_base64 TEXT;
