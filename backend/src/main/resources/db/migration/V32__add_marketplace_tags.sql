-- ============================================================
--  V32 — Chuẩn hóa marketplace_item_tags + seed tags
--  DB cũ đã có marketplace_item_tags từ V28 nhưng dùng cột
--  marketplace_item_id. Code hiện tại map theo item_id.
--  Migration này chỉ chuẩn hóa lại tên cột và seed tags.
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'marketplace_item_tags'
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'marketplace_item_tags'
              AND column_name = 'marketplace_item_id'
        ) AND NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'marketplace_item_tags'
              AND column_name = 'item_id'
        ) THEN
            ALTER TABLE marketplace_item_tags
                RENAME COLUMN marketplace_item_id TO item_id;
        END IF;
    ELSE
        CREATE TABLE marketplace_item_tags (
            item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
            tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (item_id, tag_id)
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_marketplace_item_tags_tag ON marketplace_item_tags(tag_id);

COMMENT ON TABLE marketplace_item_tags IS 'Nhiều-nhiều: marketplace item ↔ tags';

-- ── Seed tags mẫu (từ khóa mô tả, khác với category) ──────────
-- Dùng ON CONFLICT để idempotent (tags.name + slug UNIQUE)
INSERT INTO tags (name, slug) VALUES
    ('Pixel Art',        'pixel-art'),
    ('Low Poly',         'low-poly'),
    ('Top Down',         'top-down'),
    ('Side Scroller',    'side-scroller'),
    ('Multiplayer',      'multiplayer'),
    ('Singleplayer',     'singleplayer'),
    ('Roguelike',        'roguelike'),
    ('Procedural',       'procedural'),
    ('Physics',          'physics'),
    ('UI Kit',           'ui-kit'),
    ('Inventory System', 'inventory-system'),
    ('Dialogue System',  'dialogue-system'),
    ('Sound Effects',    'sound-effects'),
    ('Music',            'music'),
    ('Shader',           'shader'),
    ('Animation',        'animation'),
    ('Character',        'character'),
    ('Tileset',          'tileset'),
    ('GDScript',         'gdscript'),
    ('CSharp',           'csharp')
ON CONFLICT (name) DO NOTHING;
