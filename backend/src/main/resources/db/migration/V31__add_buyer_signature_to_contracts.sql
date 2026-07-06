ALTER TABLE contracts ADD COLUMN buyer_signature_base64 TEXT;
ALTER TABLE contracts ADD COLUMN signed_at_buyer TIMESTAMPTZ;
