-- Thay mô hình ban theo IP tĩnh (BannedIp) bằng risk chấm theo tổ hợp
-- IP + device fingerprint + hành vi. Xem docs/banned-ip-device-risk-plan.md.

CREATE TABLE public.device_fingerprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    fingerprint_hash character varying(128) NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone NOT NULL,
    risk_score integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'normal' NOT NULL,
    CONSTRAINT uq_device_fingerprints_hash UNIQUE (fingerprint_hash)
);

CREATE TABLE public.risk_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    device_fingerprint_id uuid NOT NULL,
    user_id uuid,
    ip_address inet NOT NULL,
    event_type character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fk_risk_events_device FOREIGN KEY (device_fingerprint_id)
        REFERENCES public.device_fingerprints(id) ON DELETE CASCADE
);

CREATE INDEX idx_risk_events_device_id ON public.risk_events USING btree (device_fingerprint_id);
CREATE INDEX idx_risk_events_ip_address ON public.risk_events USING btree (ip_address);
CREATE INDEX idx_risk_events_created_at ON public.risk_events USING btree (created_at);
