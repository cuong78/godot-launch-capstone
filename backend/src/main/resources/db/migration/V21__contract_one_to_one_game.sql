-- Contract chuyển từ N:1 sang 1:1 với Game: chào lại điều khoản = sửa trực
-- tiếp row hiện tại (rejectionReason ghi lý do/điều khoản mới), không tạo
-- row mới cho mỗi lần đàm phán. Chỉ giữ lại bản CHÍNH THỨC cuối cùng.
--
-- Trước khi thêm UNIQUE: nếu có game nào đang có nhiều hơn 1 contract, phải
-- dọn thủ công trước (giữ lại đúng 1 row) — migration này giả định dữ liệu
-- hiện tại chưa có tình huống đó (dự án chưa lên production).
ALTER TABLE public.contracts
    ADD CONSTRAINT uq_contracts_game_id UNIQUE (game_id);

-- negotiating/re_issued không còn ý nghĩa trong mô hình 1:1 (không tạo row
-- mới khi chào lại) — thu gọn enum còn pending/signed/expired/cancelled.
ALTER TYPE public.contract_status_enum RENAME TO contract_status_enum_old;

CREATE TYPE public.contract_status_enum AS ENUM (
    'pending',
    'signed',
    'expired',
    'cancelled'
);

-- Chuyển dữ liệu cũ (nếu có) về giá trị còn hợp lệ gần nhất trước khi đổi kiểu cột.
ALTER TABLE public.contracts
    ALTER COLUMN status DROP DEFAULT;

UPDATE public.contracts
    SET status = 'pending'
    WHERE status::text IN ('negotiating', 're_issued');

ALTER TABLE public.contracts
    ALTER COLUMN status TYPE public.contract_status_enum
        USING status::text::public.contract_status_enum,
    ALTER COLUMN status SET DEFAULT 'pending'::public.contract_status_enum;

DROP TYPE public.contract_status_enum_old;

-- Chốt cứng hợp đồng (và % tại thời điểm đó) đã dùng để tính 1 khoản chia
-- doanh thu (Transaction.type=revenue_share/commission).
ALTER TABLE public.transactions
    ADD COLUMN contract_id uuid,
    ADD CONSTRAINT fk_transactions_contract FOREIGN KEY (contract_id)
        REFERENCES public.contracts(id) ON DELETE SET NULL;
