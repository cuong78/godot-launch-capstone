ALTER TABLE public.withdrawal_requests DROP CONSTRAINT withdrawal_requests_reviewed_by_fkey;
ALTER TABLE public.withdrawal_requests DROP COLUMN processed_by;
