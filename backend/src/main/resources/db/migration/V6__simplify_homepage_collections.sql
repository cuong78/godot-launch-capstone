-- Collection behavior is now fixed by the business rules:
-- include games and assets, require all selected tags, newest first.
ALTER TABLE public.content_collections
    DROP COLUMN IF EXISTS item_type,
    DROP COLUMN IF EXISTS match_mode,
    DROP COLUMN IF EXISTS sort_mode;

-- System sections use a fixed limit of 6; custom sections use collection.max_items.
ALTER TABLE public.homepage_sections
    DROP COLUMN IF EXISTS item_limit;

DROP TYPE IF EXISTS collection_item_type_enum;
DROP TYPE IF EXISTS collection_match_mode_enum;
DROP TYPE IF EXISTS collection_sort_mode_enum;
