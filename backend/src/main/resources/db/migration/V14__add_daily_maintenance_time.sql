ALTER TABLE public.platform_settings
  ADD COLUMN daily_maintenance_time time NOT NULL DEFAULT '02:00:00';
