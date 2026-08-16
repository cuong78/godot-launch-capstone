ALTER TABLE public.platform_settings
    ADD COLUMN dispute_ban_threshold smallint NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.platform_settings.dispute_ban_threshold IS
    'Số lần bị kết luận resolved_seller_fault (seller đạo nhái) hoặc resolved_reporter_fault (reporter vu cáo) trước khi tài khoản tự động bị ban.';
