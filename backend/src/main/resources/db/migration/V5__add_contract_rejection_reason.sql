-- Flyway Migration: Add rejection reason to contracts
-- V5__add_contract_rejection_reason.sql

ALTER TABLE contracts ADD COLUMN rejection_reason TEXT;
