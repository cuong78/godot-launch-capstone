-- ============================================================
--  V28 — Tags cho marketplace + seed data
--  Bảng tags đã có (V1) nhưng chưa relation với marketplace_items.
--  Thêm junction marketplace_item_tags (nhiều-nhiều) giống game_tags.
-- ============================================================

-- Junction table: 1 marketplace item có nhiều tag, 1 tag thuộc nhiều item
CREATE TABLE marketplace_item_tags (
    item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX idx_marketplace_item_tags_tag ON marketplace_item_tags(tag_id);

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
