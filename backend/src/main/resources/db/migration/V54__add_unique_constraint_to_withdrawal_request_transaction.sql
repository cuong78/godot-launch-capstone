-- Thêm ràng buộc UNIQUE cho cột transaction_id trong bảng withdrawal_requests để đảm bảo quan hệ 1-1
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_withdrawal_requests_transaction'
          AND conrelid = 'withdrawal_requests'::regclass
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM pg_class
            WHERE relname = 'uq_withdrawal_requests_transaction'
              AND relkind = 'i'
        ) THEN
            ALTER TABLE withdrawal_requests
                ADD CONSTRAINT uq_withdrawal_requests_transaction
                UNIQUE USING INDEX uq_withdrawal_requests_transaction;
        ELSE
            ALTER TABLE withdrawal_requests
                ADD CONSTRAINT uq_withdrawal_requests_transaction
                UNIQUE (transaction_id);
        END IF;
    END IF;
END $$;
