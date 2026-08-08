ALTER TABLE public.platform_settings
  ADD COLUMN withdrawal_hold_days smallint DEFAULT 5 NOT NULL;

ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_withdrawal_hold_days_check
  CHECK (withdrawal_hold_days >= 0 AND withdrawal_hold_days <= 30);
