-- V21: Add product reviews table and rating cached columns to games and assets

CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    game_id uuid,
    asset_id uuid,
    rating smallint NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_reviews_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT chk_reviews_target CHECK (
        (game_id IS NOT NULL AND asset_id IS NULL) OR
        (game_id IS NULL AND asset_id IS NOT NULL)
    ),
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_game FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_asset FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE
);

-- Partial Unique Indexes to prevent multiple reviews for the same target by the same user
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_game_review ON public.reviews(user_id, game_id) WHERE game_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_asset_review ON public.reviews(user_id, asset_id) WHERE asset_id IS NOT NULL;

-- Indexes for performance when querying reviews
CREATE INDEX IF NOT EXISTS idx_reviews_game_id ON public.reviews USING btree (game_id) WHERE game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_asset_id ON public.reviews USING btree (asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews USING btree (user_id);

-- Add rating cached statistics to games and assets tables
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0 NOT NULL;

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) DEFAULT 0.00 NOT NULL;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0 NOT NULL;

COMMENT ON TABLE public.reviews IS 'Product reviews and ratings (1-5 stars) for games and marketplace assets';
COMMENT ON COLUMN public.reviews.rating IS 'Star rating between 1 and 5';
COMMENT ON COLUMN public.reviews.comment IS 'User short review text comment';
