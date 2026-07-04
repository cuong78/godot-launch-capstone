-- Chuyển Transaction sang mô hình ghi sổ kép: 1 order thành công = N row
-- (buyer trừ, seller cộng, platform cộng), mỗi row chỉ cần amount = số tiền
-- thay đổi trên đúng ví đó. platform_commission/net_amount dư — platform và
-- seller giờ có row riêng ghi đúng số của mình; muốn biết tổng đơn hàng thì
-- join các Transaction cùng order_id.
ALTER TABLE public.transactions
    DROP COLUMN IF EXISTS platform_commission,
    DROP COLUMN IF EXISTS net_amount;
