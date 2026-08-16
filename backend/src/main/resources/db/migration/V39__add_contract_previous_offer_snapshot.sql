-- Lưu lại đúng 1 bậc "bản chào trước" trước khi admin ghi đè hợp đồng (createOffer)
-- để Developer thấy được điểm khác biệt so với bản admin từng gửi trước đó.
-- Không lưu full history nhiều đời — chỉ đủ 1 bậc gần nhất theo đúng nhu cầu hiện tại.
ALTER TABLE public.contracts
    ADD COLUMN previous_offer_snapshot TEXT,
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.contracts.previous_offer_snapshot IS
    'JSON snapshot các field chính (contractType, revenueSplit, lumpSumAmount) của bản chào NGAY TRƯỚC lần ghi đè gần nhất — NULL nếu chưa từng bị sửa lại. Dùng để hiển thị điểm khác biệt cho Developer.';

CREATE OR REPLACE FUNCTION public.set_contracts_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON public.contracts;
CREATE TRIGGER trg_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_contracts_updated_at();
