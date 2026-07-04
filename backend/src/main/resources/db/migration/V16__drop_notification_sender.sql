-- Notification.sender đã bỏ khỏi entity — mọi thông báo hiện tại đều do
-- PLATFORM tự động gửi (thanh toán thành công, duyệt game, hợp đồng...),
-- không có "người gửi" nào cả.
ALTER TABLE public.notifications
    DROP COLUMN IF EXISTS sender_id;
