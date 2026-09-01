-- V47: Extend report_month length to accommodate date ranges (e.g. 2026-09-01 ~ 2026-09-05)
ALTER TABLE store_report_imports ALTER COLUMN report_month TYPE VARCHAR(50);
