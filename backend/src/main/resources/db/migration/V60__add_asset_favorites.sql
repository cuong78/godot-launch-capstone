CREATE TABLE IF NOT EXISTS public.asset_favorites (
    user_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.asset_favorites IS 'Danh sach asset yeu thich cua user';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'asset_favorites_pkey'
          AND conrelid = 'public.asset_favorites'::regclass
    ) THEN
        ALTER TABLE ONLY public.asset_favorites
            ADD CONSTRAINT asset_favorites_pkey PRIMARY KEY (user_id, asset_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_asset_favorites_asset_id
    ON public.asset_favorites USING btree (asset_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'asset_favorites_user_id_fkey'
          AND conrelid = 'public.asset_favorites'::regclass
    ) THEN
        ALTER TABLE ONLY public.asset_favorites
            ADD CONSTRAINT asset_favorites_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'asset_favorites_asset_id_fkey'
          AND conrelid = 'public.asset_favorites'::regclass
    ) THEN
        ALTER TABLE ONLY public.asset_favorites
            ADD CONSTRAINT asset_favorites_asset_id_fkey
            FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;
    END IF;
END $$;
