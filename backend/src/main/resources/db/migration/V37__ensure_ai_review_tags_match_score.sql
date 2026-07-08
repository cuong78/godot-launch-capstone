ALTER TABLE public.ai_review_reports
ADD COLUMN IF NOT EXISTS tags_match_score integer;
