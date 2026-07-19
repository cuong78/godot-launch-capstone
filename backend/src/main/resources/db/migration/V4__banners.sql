CREATE TABLE public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    description character varying(1000) NOT NULL,
    image_url text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT banners_pkey PRIMARY KEY (id),
    CONSTRAINT banners_display_order_non_negative CHECK (display_order >= 0)
);

CREATE INDEX idx_banners_display_order
    ON public.banners USING btree (display_order, created_at);

INSERT INTO public.banners (title, description, image_url, display_order)
VALUES
    ('Launch Your Godot Game', 'Discover original Godot games and production-ready source code from independent creators.', '/home-hero/game.webp', 1),
    ('Build Faster With Premium Assets', 'Find polished visual assets, scripts, shaders, and complete systems for your next project.', '/home-hero/asset.jpg', 2),
    ('A Marketplace Built For Creators', 'Browse verified resources and support the developers building the Godot ecosystem.', '/home-hero/marketplace.jpg', 3);
