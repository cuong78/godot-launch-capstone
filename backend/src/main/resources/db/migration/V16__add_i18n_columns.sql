-- ============================================================
--  V15: Add i18n columns to categories, tags, and banners
-- ============================================================

ALTER TABLE public.categories
  ADD COLUMN name_vi character varying(100),
  ADD COLUMN name_en character varying(100),
  ADD COLUMN name_ja character varying(100),
  ADD COLUMN description_vi text,
  ADD COLUMN description_en text,
  ADD COLUMN description_ja text;

ALTER TABLE public.tags
  ADD COLUMN name_vi character varying(100),
  ADD COLUMN name_en character varying(100),
  ADD COLUMN name_ja character varying(100);

ALTER TABLE public.banners
  ADD COLUMN title_vi character varying(200),
  ADD COLUMN title_en character varying(200),
  ADD COLUMN title_ja character varying(200),
  ADD COLUMN description_vi character varying(1000),
  ADD COLUMN description_en character varying(1000),
  ADD COLUMN description_ja character varying(1000);
