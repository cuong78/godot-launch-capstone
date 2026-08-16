ALTER TABLE public.disputes ADD COLUMN seller_outstanding_debt numeric(15,2);
COMMENT ON COLUMN public.disputes.seller_outstanding_debt IS 'Tổng tiền A còn nợ platform sau khi platform đã ứng trước hoàn B,C + bồi thường D. NULL/0 = A đã trả đủ ngay lúc resolve hoặc không có nợ.';
