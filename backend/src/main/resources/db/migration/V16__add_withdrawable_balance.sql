-- Separate sale revenue from restricted funds (top-ups/refund receipts).
-- Only withdrawable_balance may back a self-service withdrawal.
ALTER TABLE public.wallets
    ADD COLUMN withdrawable_balance numeric(15,2);

-- Replay the ledger in chronological order. Aggregate SUMs are insufficient
-- because purchases consume restricted funds before sale revenue.
DO $$
DECLARE
    wallet_row record;
    txn_row record;
    restricted_amount numeric(15,2);
    withdrawable_amount numeric(15,2);
    debit_amount numeric(15,2);
    consumed_amount numeric(15,2);
BEGIN
    FOR wallet_row IN
        SELECT id, balance
        FROM public.wallets
        ORDER BY id
    LOOP
        restricted_amount := 0;
        withdrawable_amount := 0;

        FOR txn_row IN
            SELECT amount, type, order_id
            FROM public.transactions
            WHERE wallet_id = wallet_row.id
            ORDER BY created_at, id
        LOOP
            IF txn_row.amount >= 0 THEN
                IF txn_row.type = 'revenue_share'::public.txn_type_enum
                   OR (
                       txn_row.type IN (
                           'asset_purchase'::public.txn_type_enum,
                           'source_code_purchase'::public.txn_type_enum
                       )
                       AND txn_row.order_id IS NOT NULL
                   ) THEN
                    -- Historical direct-PayOS seller credits used a purchase type.
                    withdrawable_amount := withdrawable_amount + txn_row.amount;
                ELSE
                    -- Top-ups, incoming refunds, commission and unknown credits are
                    -- restricted by default. This is the safe anti-laundering fallback.
                    restricted_amount := restricted_amount + txn_row.amount;
                END IF;
            ELSE
                debit_amount := ABS(txn_row.amount);

                IF txn_row.type IN (
                    'asset_purchase'::public.txn_type_enum,
                    'source_code_purchase'::public.txn_type_enum
                ) THEN
                    -- Purchases consume restricted funds first.
                    consumed_amount := LEAST(restricted_amount, debit_amount);
                    restricted_amount := restricted_amount - consumed_amount;
                    debit_amount := debit_amount - consumed_amount;
                    withdrawable_amount := GREATEST(0, withdrawable_amount - debit_amount);
                ELSIF txn_row.type IN (
                    'withdrawal'::public.txn_type_enum,
                    'refund'::public.txn_type_enum
                ) THEN
                    -- Completed withdrawals and seller refunds consume sale revenue first.
                    consumed_amount := LEAST(withdrawable_amount, debit_amount);
                    withdrawable_amount := withdrawable_amount - consumed_amount;
                    debit_amount := debit_amount - consumed_amount;
                    restricted_amount := GREATEST(0, restricted_amount - debit_amount);
                ELSE
                    -- Unknown debits use the conservative purchase allocation.
                    consumed_amount := LEAST(restricted_amount, debit_amount);
                    restricted_amount := restricted_amount - consumed_amount;
                    debit_amount := debit_amount - consumed_amount;
                    withdrawable_amount := GREATEST(0, withdrawable_amount - debit_amount);
                END IF;
            END IF;
        END LOOP;

        -- Reconcile against the authoritative current wallet balance. Any
        -- unexplained positive remainder stays restricted; any deficit removes
        -- withdrawable funds before known restricted funds.
        restricted_amount := LEAST(restricted_amount, wallet_row.balance);
        withdrawable_amount := LEAST(
            withdrawable_amount,
            GREATEST(0, wallet_row.balance - restricted_amount)
        );

        UPDATE public.wallets
        SET withdrawable_balance = withdrawable_amount
        WHERE id = wallet_row.id;
    END LOOP;
END $$;

ALTER TABLE public.wallets
    ALTER COLUMN withdrawable_balance SET DEFAULT 0.00,
    ALTER COLUMN withdrawable_balance SET NOT NULL;

ALTER TABLE public.wallets
    ADD CONSTRAINT wallets_withdrawable_balance_check
    CHECK (
        withdrawable_balance >= 0
        AND withdrawable_balance <= balance
    );

-- A dispute refund creates two ledger entries: a negative seller debit and
-- a positive reporter credit. The previous constraint only allowed positive
-- refund rows, so the seller side could never be persisted.
ALTER TABLE public.transactions
    DROP CONSTRAINT IF EXISTS transactions_amount_check;

ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_amount_check
    CHECK (
        (
            type IN (
                'withdrawal'::public.txn_type_enum,
                'source_code_purchase'::public.txn_type_enum,
                'asset_purchase'::public.txn_type_enum
            )
            AND amount <= 0
        )
        OR (
            type IN (
                'revenue_share'::public.txn_type_enum,
                'commission'::public.txn_type_enum,
                'wallet_topup'::public.txn_type_enum
            )
            AND amount >= 0
        )
        OR (
            type = 'refund'::public.txn_type_enum
            AND amount <> 0
        )
    );

COMMENT ON COLUMN public.wallets.withdrawable_balance IS
    'Sale revenue remaining before pending-withdrawal reservation. Top-ups and incoming refunds never increase it.';
