-- Seed two content collections and expose them as homepage sections.
-- This file is idempotent: collections are upserted by slug and sections are
-- updated/inserted by collection_id.

\set ON_ERROR_STOP on
SET client_encoding TO 'UTF8';

-- ============================================================
-- 1. Category-driven collection
-- ============================================================
INSERT INTO public.content_collections (
    title,
    slug,
    description,
    max_items,
    is_active
)
VALUES (
    'Worlds & Adventures',
    'worlds-and-adventures',
    'Published adventures and curated environment packs across fantasy, historical, sci-fi, city, island and nature themes.',
    10,
    TRUE
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    max_items = EXCLUDED.max_items,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DELETE FROM public.content_collection_categories
WHERE collection_id = (
    SELECT id
    FROM public.content_collections
    WHERE slug = 'worlds-and-adventures'
);

INSERT INTO public.content_collection_categories (collection_id, category_id)
SELECT collection.id, category.id
FROM public.content_collections collection
JOIN public.categories category ON category.slug IN (
    '3d-env-fantasy',
    '3d-env-historical',
    '3d-env-towns-villages',
    '3d-env-dungeon',
    '3d-env-sci-fi',
    '3d-env-island',
    '3d-env-aquatic',
    '3d-env-cities',
    '3d-env-farm',
    '3d-env-forest-jungle',
    'action-adventure'
)
WHERE collection.slug = 'worlds-and-adventures'
ON CONFLICT DO NOTHING;

-- Ensure this collection is driven only by categories.
DELETE FROM public.content_collection_tags
WHERE collection_id = (
    SELECT id
    FROM public.content_collections
    WHERE slug = 'worlds-and-adventures'
);

-- ============================================================
-- 2. Tag-driven collection
-- ============================================================
INSERT INTO public.content_collections (
    title,
    slug,
    description,
    max_items,
    is_active
)
VALUES (
    'Stylized Picks',
    'stylized-picks',
    'The newest published games and active assets carrying the Stylized tag.',
    10,
    TRUE
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    max_items = EXCLUDED.max_items,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DELETE FROM public.content_collection_tags
WHERE collection_id = (
    SELECT id
    FROM public.content_collections
    WHERE slug = 'stylized-picks'
);

INSERT INTO public.content_collection_tags (collection_id, tag_id)
SELECT collection.id, tag.id
FROM public.content_collections collection
JOIN public.tags tag ON tag.slug = 'stylized'
WHERE collection.slug = 'stylized-picks'
ON CONFLICT DO NOTHING;

-- Ensure this collection is driven only by tags.
DELETE FROM public.content_collection_categories
WHERE collection_id = (
    SELECT id
    FROM public.content_collections
    WHERE slug = 'stylized-picks'
);

-- ============================================================
-- 3. Guard against empty collections
-- ============================================================
-- Both collections intentionally use item_type=ALL. Assert that the seeded
-- relations resolve to at least one storefront Game and one storefront Asset.
DO $$
DECLARE
    category_relation_count INTEGER;
    tag_relation_count INTEGER;
    category_asset_count INTEGER;
    category_game_count INTEGER;
    tag_asset_count INTEGER;
    tag_game_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO category_relation_count
    FROM public.content_collections collection
    JOIN public.content_collection_categories relation
        ON relation.collection_id = collection.id
    WHERE collection.slug = 'worlds-and-adventures';

    SELECT COUNT(*)
    INTO tag_relation_count
    FROM public.content_collections collection
    JOIN public.content_collection_tags relation
        ON relation.collection_id = collection.id
    WHERE collection.slug = 'stylized-picks';

    SELECT COUNT(DISTINCT asset.id)
    INTO category_asset_count
    FROM public.content_collections collection
    JOIN public.content_collection_categories relation
        ON relation.collection_id = collection.id
    JOIN public.assets asset
        ON asset.category_id = relation.category_id
       AND asset.status = 'active'
    WHERE collection.slug = 'worlds-and-adventures';

    SELECT COUNT(DISTINCT game.id)
    INTO category_game_count
    FROM public.content_collections collection
    JOIN public.content_collection_categories relation
        ON relation.collection_id = collection.id
    JOIN public.games game
        ON game.category_id = relation.category_id
       AND game.status = 'published'
    WHERE collection.slug = 'worlds-and-adventures';

    SELECT COUNT(DISTINCT asset.id)
    INTO tag_asset_count
    FROM public.content_collections collection
    JOIN public.content_collection_tags relation
        ON relation.collection_id = collection.id
    JOIN public.asset_tags asset_tag
        ON asset_tag.tag_id = relation.tag_id
    JOIN public.assets asset
        ON asset.id = asset_tag.asset_id
       AND asset.status = 'active'
    WHERE collection.slug = 'stylized-picks';

    SELECT COUNT(DISTINCT game.id)
    INTO tag_game_count
    FROM public.content_collections collection
    JOIN public.content_collection_tags relation
        ON relation.collection_id = collection.id
    JOIN public.game_tags game_tag
        ON game_tag.tag_id = relation.tag_id
    JOIN public.games game
        ON game.id = game_tag.game_id
       AND game.status = 'published'
    WHERE collection.slug = 'stylized-picks';

    IF category_relation_count <> 11 THEN
        RAISE EXCEPTION
            'worlds-and-adventures expected 11 category relations but found %',
            category_relation_count;
    END IF;

    IF tag_relation_count <> 1 THEN
        RAISE EXCEPTION
            'stylized-picks expected the Stylized tag relation but found % relations',
            tag_relation_count;
    END IF;

    IF category_asset_count = 0 OR category_game_count = 0 THEN
        RAISE EXCEPTION
            'worlds-and-adventures must match active assets and published games (assets=%, games=%)',
            category_asset_count,
            category_game_count;
    END IF;

    IF tag_asset_count = 0 OR tag_game_count = 0 THEN
        RAISE EXCEPTION
            'stylized-picks must match active assets and published games (assets=%, games=%)',
            tag_asset_count,
            tag_game_count;
    END IF;

    RAISE NOTICE
        'Collection matches: worlds-and-adventures assets=%, games=%; stylized-picks assets=%, games=%',
        category_asset_count,
        category_game_count,
        tag_asset_count,
        tag_game_count;
END $$;

-- ============================================================
-- 4. Add/update homepage sections for the two collections
-- ============================================================
UPDATE public.homepage_sections section
SET title = 'Worlds & Adventures',
    section_type = 'COLLECTION',
    display_order = 30,
    is_active = TRUE,
    is_system = FALSE,
    updated_at = NOW()
FROM public.content_collections collection
WHERE section.collection_id = collection.id
  AND collection.slug = 'worlds-and-adventures';

INSERT INTO public.homepage_sections (
    title,
    section_type,
    collection_id,
    display_order,
    is_active,
    is_system
)
SELECT
    'Worlds & Adventures',
    'COLLECTION',
    collection.id,
    30,
    TRUE,
    FALSE
FROM public.content_collections collection
WHERE collection.slug = 'worlds-and-adventures'
  AND NOT EXISTS (
      SELECT 1
      FROM public.homepage_sections section
      WHERE section.collection_id = collection.id
  );

UPDATE public.homepage_sections section
SET title = 'Stylized Picks',
    section_type = 'COLLECTION',
    display_order = 40,
    is_active = TRUE,
    is_system = FALSE,
    updated_at = NOW()
FROM public.content_collections collection
WHERE section.collection_id = collection.id
  AND collection.slug = 'stylized-picks';

INSERT INTO public.homepage_sections (
    title,
    section_type,
    collection_id,
    display_order,
    is_active,
    is_system
)
SELECT
    'Stylized Picks',
    'COLLECTION',
    collection.id,
    40,
    TRUE,
    FALSE
FROM public.content_collections collection
WHERE collection.slug = 'stylized-picks'
  AND NOT EXISTS (
      SELECT 1
      FROM public.homepage_sections section
      WHERE section.collection_id = collection.id
  );

-- ============================================================
-- 5. Verification
-- ============================================================
SELECT
    collection.title,
    collection.slug,
    collection.max_items,
    COUNT(DISTINCT relation_category.category_id) AS category_count,
    COUNT(DISTINCT relation_tag.tag_id) AS tag_count,
    section.display_order,
    section.is_active AS section_active
FROM public.content_collections collection
LEFT JOIN public.content_collection_categories relation_category
    ON relation_category.collection_id = collection.id
LEFT JOIN public.content_collection_tags relation_tag
    ON relation_tag.collection_id = collection.id
LEFT JOIN public.homepage_sections section
    ON section.collection_id = collection.id
WHERE collection.slug IN ('worlds-and-adventures', 'stylized-picks')
GROUP BY collection.id, section.display_order, section.is_active
ORDER BY section.display_order;
