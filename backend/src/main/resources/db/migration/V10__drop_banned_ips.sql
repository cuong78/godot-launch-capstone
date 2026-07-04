-- Bỏ mô hình "ban cứng theo IP" — dễ ban nhầm người dùng chung IP (quán net,
-- CGNAT), dễ né bằng đổi VPN. Thay bằng risk chấm theo tổ hợp IP + device
-- fingerprint + hành vi (xem docs/banned-ip-device-risk-plan.md).
DROP TABLE IF EXISTS public.banned_ips;
