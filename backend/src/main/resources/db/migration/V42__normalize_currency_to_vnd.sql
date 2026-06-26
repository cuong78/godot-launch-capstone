ALTER TABLE wallets
    ALTER COLUMN currency SET DEFAULT 'VND';

ALTER TABLE withdrawal_requests
    ALTER COLUMN currency SET DEFAULT 'VND';

ALTER TABLE payments
    ALTER COLUMN currency SET DEFAULT 'VND';

UPDATE wallets
SET currency = 'VND'
WHERE currency IS DISTINCT FROM 'VND';

UPDATE withdrawal_requests
SET currency = 'VND'
WHERE currency IS DISTINCT FROM 'VND';

UPDATE payments
SET currency = 'VND'
WHERE currency IS DISTINCT FROM 'VND';
