-- Developer đề xuất % chia doanh thu mong muốn cho hợp đồng co_publishing
-- (tách biệt price_proposed vốn là VND cho full_acquisition/marketplace).
-- Chỉ là đề xuất tham khảo — admin toàn quyền sửa lại khi soạn hợp đồng thật
-- (xem Contract.revenueSplit).
ALTER TABLE public.games
    ADD COLUMN revenue_split_proposed smallint,
    ADD CONSTRAINT chk_games_revenue_split_proposed
        CHECK (revenue_split_proposed IS NULL OR revenue_split_proposed BETWEEN 0 AND 100);

COMMENT ON COLUMN public.games.revenue_split_proposed IS
    'Developer đề xuất % doanh thu mong muốn nhận (0-100) cho hợp đồng co_publishing. Chỉ tham khảo — admin có thể sửa lại khi soạn Contract.';
