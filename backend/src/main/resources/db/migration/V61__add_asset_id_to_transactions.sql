ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS asset_id uuid;

UPDATE public.transactions t
SET asset_id = o.asset_id
FROM public.orders o
WHERE o.transaction_id = t.id
  AND o.asset_id IS NOT NULL
  AND t.asset_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_asset_id
    ON public.transactions USING btree (asset_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transactions_asset_id_fkey'
          AND conrelid = 'public.transactions'::regclass
    ) THEN
        ALTER TABLE ONLY public.transactions
            ADD CONSTRAINT transactions_asset_id_fkey
            FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;
    END IF;
END $$;
