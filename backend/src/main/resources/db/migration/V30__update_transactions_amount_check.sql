ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check CHECK (
  ((type IN ('withdrawal', 'source_code_purchase', 'asset_purchase')) AND (amount < 0)) OR
  ((type NOT IN ('withdrawal', 'source_code_purchase', 'asset_purchase')) AND (amount > 0))
);
