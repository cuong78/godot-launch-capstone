ALTER TABLE public.withdrawal_requests
DROP CONSTRAINT IF EXISTS withdrawal_requests_reviewed_by_fkey;

ALTER TABLE public.withdrawal_requests
DROP COLUMN IF EXISTS processed_by;
