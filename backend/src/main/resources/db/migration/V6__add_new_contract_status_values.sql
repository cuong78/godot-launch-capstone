-- Flyway Migration: Add negotiating and re_issued to contract_status_enum
ALTER TYPE contract_status_enum ADD VALUE 'negotiating';
ALTER TYPE contract_status_enum ADD VALUE 're_issued';
