ALTER TABLE public.platform_settings
  ADD COLUMN refund_deadline_days smallint DEFAULT 5 NOT NULL;

ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_refund_deadline_days_check
  CHECK (refund_deadline_days >= 1 AND refund_deadline_days <= 30);

ALTER TABLE public.disputes
  ADD COLUMN refund_confirmed_at timestamp with time zone;

ALTER TABLE public.users
  ADD COLUMN locked_for_dispute_id uuid REFERENCES public.disputes(id);
