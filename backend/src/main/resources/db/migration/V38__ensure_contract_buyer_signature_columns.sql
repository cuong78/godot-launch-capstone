ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS buyer_signature_base64 text;

ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS signed_at_buyer timestamptz;
