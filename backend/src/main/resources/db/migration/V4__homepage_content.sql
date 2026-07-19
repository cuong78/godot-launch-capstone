CREATE TYPE collection_item_type_enum AS ENUM ('GAME', 'ASSET', 'ALL');
CREATE TYPE collection_match_mode_enum AS ENUM ('ANY', 'ALL');
CREATE TYPE collection_sort_mode_enum AS ENUM ('NEWEST', 'POPULAR', 'RANDOM');
CREATE TYPE homepage_section_type_enum AS ENUM ('RECENT_RELEASES', 'FREE_CONTENT', 'COLLECTION');

CREATE TABLE content_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(160) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    description TEXT,
    item_type collection_item_type_enum NOT NULL DEFAULT 'ALL',
    match_mode collection_match_mode_enum NOT NULL DEFAULT 'ANY',
    sort_mode collection_sort_mode_enum NOT NULL DEFAULT 'NEWEST',
    max_items INTEGER NOT NULL DEFAULT 10 CHECK (max_items BETWEEN 1 AND 10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE content_collection_tags (
    collection_id UUID NOT NULL REFERENCES content_collections(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
    PRIMARY KEY (collection_id, tag_id)
);

CREATE TABLE content_collection_categories (
    collection_id UUID NOT NULL REFERENCES content_collections(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    PRIMARY KEY (collection_id, category_id)
);

CREATE TABLE homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(160) NOT NULL,
    section_type homepage_section_type_enum NOT NULL,
    collection_id UUID REFERENCES content_collections(id) ON DELETE RESTRICT,
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    item_limit INTEGER NOT NULL CHECK (item_limit BETWEEN 1 AND 10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT homepage_section_collection_rule CHECK (
        (section_type = 'COLLECTION' AND collection_id IS NOT NULL)
        OR (section_type <> 'COLLECTION' AND collection_id IS NULL)
    )
);

CREATE UNIQUE INDEX ux_homepage_system_section_type
    ON homepage_sections(section_type)
    WHERE is_system = TRUE;
CREATE INDEX idx_homepage_sections_order ON homepage_sections(is_active, display_order);

INSERT INTO homepage_sections (title, section_type, display_order, item_limit, is_active, is_system)
VALUES
    ('Recent Releases', 'RECENT_RELEASES', 10, 6, TRUE, TRUE),
    ('Free Content', 'FREE_CONTENT', 20, 6, TRUE, TRUE);
