-- V30 buộc amount phải strictly khác 0 (< 0 hoặc > 0), nhưng asset/game FREE (giá 0)
-- là case hợp lệ (assets.price và games.price_proposed đều cho phép = 0) — mua đồ free
-- luôn sinh ra 3 dòng Transaction có amount = 0, vi phạm constraint cũ và làm rollback
-- toàn bộ giao dịch mua. Nới constraint sang <= 0 / >= 0 để cho phép amount = 0.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check CHECK (
  ((type IN ('withdrawal', 'source_code_purchase', 'asset_purchase')) AND (amount <= 0)) OR
  ((type NOT IN ('withdrawal', 'source_code_purchase', 'asset_purchase')) AND (amount >= 0))
);
