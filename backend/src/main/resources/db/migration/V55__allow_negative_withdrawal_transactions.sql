ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS transactions_amount_check;

ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS transactions_net_amount_check;

UPDATE transactions
SET
    amount = -ABS(amount),
    platform_commission = 0,
    net_amount = -ABS(amount)
WHERE type = 'withdrawal'::txn_type_enum;

ALTER TABLE transactions
    ADD CONSTRAINT transactions_amount_check
        CHECK (
            (type = 'withdrawal'::txn_type_enum AND amount < 0)
            OR
            (type <> 'withdrawal'::txn_type_enum AND amount > 0)
        );

ALTER TABLE transactions
    ADD CONSTRAINT transactions_net_amount_check
        CHECK (
            (type = 'withdrawal'::txn_type_enum AND net_amount < 0)
            OR
            (type <> 'withdrawal'::txn_type_enum AND net_amount >= 0)
        );
