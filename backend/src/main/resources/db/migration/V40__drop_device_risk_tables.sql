-- Rollback tinh nang device risk scoring (V11) - chua tung duoc trien khai
-- (khong co Repository/Service/Controller nao dung 2 bang nay). Xem
-- docs/banned-ip-device-risk-plan.md (da bi xoa) de biet ke hoach cu.

DROP TABLE IF EXISTS public.risk_events;
DROP TABLE IF EXISTS public.device_fingerprints;
