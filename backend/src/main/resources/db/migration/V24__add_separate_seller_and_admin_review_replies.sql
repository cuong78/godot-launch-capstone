-- V24: Add separate seller and admin reply columns to reviews table

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS seller_reply text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS seller_replied_at timestamp with time zone;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS admin_replied_at timestamp with time zone;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS admin_replied_by_user_id uuid;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_reviews_admin_replied_by_user'
    ) THEN
        ALTER TABLE public.reviews 
        ADD CONSTRAINT fk_reviews_admin_replied_by_user 
        FOREIGN KEY (admin_replied_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN public.reviews.seller_reply IS 'Seller response text to the buyer review';
COMMENT ON COLUMN public.reviews.seller_replied_at IS 'Timestamp when the seller response was submitted';
COMMENT ON COLUMN public.reviews.admin_reply IS 'Admin official response text to the buyer review';
COMMENT ON COLUMN public.reviews.admin_replied_at IS 'Timestamp when the admin response was submitted';
COMMENT ON COLUMN public.reviews.admin_replied_by_user_id IS 'ID of the Admin who submitted the response';
