-- Track the version each buyer last downloaded.
ALTER TABLE public.orders
    ADD COLUMN last_downloaded_game_version_id uuid,
    ADD COLUMN last_downloaded_at timestamp with time zone;

ALTER TABLE public.orders
    ADD CONSTRAINT fk_orders_last_downloaded_game_version
    FOREIGN KEY (last_downloaded_game_version_id)
    REFERENCES public.game_versions(id)
    ON DELETE SET NULL;

CREATE INDEX idx_orders_game_buyer
    ON public.orders (game_id, buyer_id)
    WHERE game_id IS NOT NULL;

-- Typed navigation metadata and an idempotency key for durable notifications.
ALTER TABLE public.notifications
    ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN event_key character varying(255);

CREATE UNIQUE INDEX uq_notifications_event_key
    ON public.notifications (event_key)
    WHERE event_key IS NOT NULL;

-- Durable outbox event created in the same transaction that activates a version.
CREATE TABLE public.game_version_release_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    game_version_id uuid NOT NULL REFERENCES public.game_versions(id) ON DELETE CASCADE,
    status character varying(20) NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
    locked_at timestamp with time zone,
    completed_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT uq_game_version_release_event UNIQUE (game_version_id),
    CONSTRAINT chk_game_version_release_event_status
        CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_game_version_release_events_pending
    ON public.game_version_release_events (next_attempt_at, created_at)
    WHERE status IN ('pending', 'processing');

-- Repair legacy data before enforcing the single-current-version invariant.
WITH ranked_current_versions AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY game_id
               ORDER BY released_at DESC, id DESC
           ) AS current_rank
    FROM public.game_versions
    WHERE is_current = true
)
UPDATE public.game_versions AS version
SET is_current = false
FROM ranked_current_versions AS ranked
WHERE version.id = ranked.id
  AND ranked.current_rank > 1;

CREATE UNIQUE INDEX uq_game_versions_one_current
    ON public.game_versions (game_id)
    WHERE is_current = true;
