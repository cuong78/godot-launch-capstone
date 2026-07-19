-- ============================================================
--  V5: Redesign Categories (Parent-Child) & Comprehensive Tags
-- ============================================================

-- Preserve current product/collection assignments by slug. The seeded IDs below
-- are intentionally replaced, so retaining raw foreign keys would not be safe.
CREATE TEMP TABLE migration_v5_game_categories AS
SELECT g.id AS game_id, c.slug
FROM public.games g
JOIN public.categories c ON c.id = g.category_id;

CREATE TEMP TABLE migration_v5_asset_categories AS
SELECT a.id AS asset_id, c.slug
FROM public.assets a
JOIN public.categories c ON c.id = a.category_id;

CREATE TEMP TABLE migration_v5_game_tags AS
SELECT gt.game_id, t.slug
FROM public.game_tags gt
JOIN public.tags t ON t.id = gt.tag_id;

CREATE TEMP TABLE migration_v5_asset_tags AS
SELECT at.asset_id, t.slug
FROM public.asset_tags at
JOIN public.tags t ON t.id = at.tag_id;

CREATE TEMP TABLE migration_v5_collection_categories AS
SELECT cc.collection_id, c.slug
FROM public.content_collection_categories cc
JOIN public.categories c ON c.id = cc.category_id;

CREATE TEMP TABLE migration_v5_collection_tags AS
SELECT ct.collection_id, t.slug
FROM public.content_collection_tags ct
JOIN public.tags t ON t.id = ct.tag_id;

-- Collection foreign keys use ON DELETE RESTRICT, so detach them before reseeding.
DELETE FROM public.content_collection_categories;
DELETE FROM public.content_collection_tags;

-- Clear old categories and tags. Product foreign keys are SET NULL/CASCADE by V1.
DELETE FROM public.categories;
DELETE FROM public.tags;

-- Seed redesigned hierarchical categories
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'Action', 'action', 'Action games', NULL, 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f05', 'Adventure', 'adventure', 'Adventure games', NULL, 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f07', 'Strategy', 'strategy', 'Strategy games', NULL, 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f09', 'Casual', 'casual', 'Casual games', NULL, 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11', 'Platformer', 'platformer', 'Platformer games', NULL, 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f12', 'Racing', 'racing', 'Racing games', NULL, 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f13', 'Simulation', 'simulation', 'Simulation games', NULL, 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f14', 'Sports', 'sports', 'Sports games', NULL, 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f15', 'Puzzle', 'puzzle', 'Puzzle games', NULL, 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', '2D Assets', '2d-assets', '2D graphics and sprites', NULL, 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', '3D Assets', '3d-assets', '3D models and objects', NULL, 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11', 'Templates & Source Code', 'templates', 'Full game templates and source code projects', NULL, 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f15', 'Plugins & Add-ons', 'plugins', 'Godot editor plugins and code add-ons', NULL, 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f19', 'Materials & Shaders', 'materials-shaders', 'Textures, materials, and custom shaders', NULL, 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f23', 'Audio & Music', 'audio-music', 'Sound effects and music tracks', NULL, 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f27', 'VFX & Animations', 'vfx-animations', 'Visual effects and animations', NULL, 'asset');

INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f02', 'Shooter', 'shooter', 'Shooter games', 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f03', 'Fighting', 'fighting', 'Fighting games', 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f04', 'Action-Adventure', 'action-adventure', 'Action-Adventure games', 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', 'RPG', 'rpg', 'Role-playing games', 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f05', 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f08', 'City Builder', 'city-builder', 'City building strategy games', 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f07', 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f10', 'Card Game', 'card-game', 'Card and board games', 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f09', 'game');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f02', 'Sprites & Characters', '2d-sprites', '2D sprites and characters', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f03', 'Tilesets & Environments', '2d-tilesets', '2D tilesets and background assets', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f04', 'UI Kits & Icons', 'ui-kits', '2D user interface kits and icons', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f05', 'Backgrounds & Parallax', '2d-backgrounds', '2D backgrounds and parallax layers', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f07', '3D Characters', '3d-characters', '3D character models and rigs', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f08', '3D Props & Objects', '3d-props', '3D props, items, and weapons', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f09', '3D Environments & Modular', '3d-environments', '3D environments and modular building sets', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f10', '3D Vehicles', '3d-vehicles', '3D vehicles and drivable assets', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f12', 'Full Game Templates', 'game-templates', 'Complete game templates and starting projects', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f13', 'Gameplay Systems', 'gameplay-systems', 'Specific gameplay system components (inventory, quests, dialogue)', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f14', 'Multiplayer & Network', 'multiplayer-network', 'Multiplayer and networking templates', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f16', 'Editor Helpers', 'editor-helpers', 'Godot editor tools and workflow helpers', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f15', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f17', 'Runtime Scripts & Nodes', 'runtime-scripts', 'Custom runtime scripts and node classes', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f15', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f18', 'Integration Tools', 'integration-tools', 'API and external service integration helpers', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f15', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f20', 'PBR Materials', 'pbr-materials', 'PBR materials and texture packs', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f19', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f21', 'Godot Shaders', 'godot-shaders', 'Godot specific .gdshader scripts', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f19', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f22', 'Textures & Patterns', 'textures-patterns', 'UI textures and pattern backgrounds', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f19', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f24', 'Sound Effects', 'sfx', 'Sound effects (SFX) packs', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f23', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f25', 'Music Tracks', 'music-tracks', 'Original soundtracks and music loops', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f23', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f26', 'Ambient & Background Noise', 'ambient-noise', 'Ambient sounds and background noises', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f23', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f28', '3D Particle Effects', '3d-vfx', '3D visual effects and particles', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f27', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f29', '2D Particle Effects', '2d-vfx', '2D visual effects and particles', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f27', 'asset');
INSERT INTO public.categories (id, name, slug, description, parent_id, type) VALUES ('e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f30', 'Rigged Animations', 'rigged-animations', 'Rigged character animations', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f27', 'asset');

-- Seed comprehensive unique tags
INSERT INTO public.tags (id, name, slug) VALUES ('57811e3c-529e-458f-b3e4-7eb74ec13f1a', '1970s', '1970s');
INSERT INTO public.tags (id, name, slug) VALUES ('ee8d4b14-2e82-41c5-8c8f-2d4fb7a5b8e9', '2DAsset', '2d-asset');
INSERT INTO public.tags (id, name, slug) VALUES ('24d77dfb-1eb4-429d-9fce-2081272f5ec5', 'AI', 'ai');
INSERT INTO public.tags (id, name, slug) VALUES ('fad89064-041e-4f7b-b371-c941eaffbef3', 'Abstract', 'abstract');
INSERT INTO public.tags (id, name, slug) VALUES ('ac15c177-b25d-44e6-b115-4e80d71e33d9', 'Action', 'action');
INSERT INTO public.tags (id, name, slug) VALUES ('f85a5d08-8e13-4125-ad7b-a1e1d4375db8', 'Actor', 'actor');
INSERT INTO public.tags (id, name, slug) VALUES ('71167317-324b-45fa-ae40-8221bb0b7196', 'Advanced', 'advanced');
INSERT INTO public.tags (id, name, slug) VALUES ('701ab366-f4aa-4d4b-91d5-9aeecab3dd21', 'Adventure', 'adventure');
INSERT INTO public.tags (id, name, slug) VALUES ('4f57b8e1-5b9c-4388-a4dd-06fb2afd4863', 'American', 'american');
INSERT INTO public.tags (id, name, slug) VALUES ('2ea0d84b-c286-4247-9b5b-bf7eca39676f', 'Angled', 'angled');
INSERT INTO public.tags (id, name, slug) VALUES ('4d85ebae-3810-414c-b4ca-5155ebec54a5', 'Animal', 'animal');
INSERT INTO public.tags (id, name, slug) VALUES ('b933ebd0-603b-41f3-91d4-4b63e90978e5', 'Animated', 'animated');
INSERT INTO public.tags (id, name, slug) VALUES ('aeab0098-8813-4053-924c-355fa6e80136', 'Animation', 'animation');
INSERT INTO public.tags (id, name, slug) VALUES ('a9a44878-bfc9-4c2e-a912-20523cc927da', 'Archery', 'archery');
INSERT INTO public.tags (id, name, slug) VALUES ('0b9d4a41-d7db-42f7-a368-6a674fe92581', 'Architecture', 'architecture');
INSERT INTO public.tags (id, name, slug) VALUES ('f853884a-2df6-48d8-be7b-4bc317397792', 'Archviz', 'archviz');
INSERT INTO public.tags (id, name, slug) VALUES ('e50c7e13-aee5-4f9e-8e38-7cd3fd17d722', 'Art', 'art');
INSERT INTO public.tags (id, name, slug) VALUES ('3376209a-c14f-433e-b344-712305371bae', 'Attack', 'attack');
INSERT INTO public.tags (id, name, slug) VALUES ('1f52ee1e-b4d9-467a-a150-2a1d09ef39f4', 'Backroom', 'backroom');
INSERT INTO public.tags (id, name, slug) VALUES ('3ccdcc85-7412-4817-adb9-7a71ebcbbaef', 'Basket', 'basket');
INSERT INTO public.tags (id, name, slug) VALUES ('3c37e5ee-0ea1-466f-afdc-90ce56a0ad94', 'Basketball', 'basketball');
INSERT INTO public.tags (id, name, slug) VALUES ('6a28decc-2781-445a-8098-c5df1ae06319', 'Beat', 'beat');
INSERT INTO public.tags (id, name, slug) VALUES ('c8e48fd3-2c74-418b-8710-7bf169532121', 'Bike', 'bike');
INSERT INTO public.tags (id, name, slug) VALUES ('583e8fc0-752f-4bf9-acf8-74b0f61b0f1f', 'Blueprint', 'blueprint');
INSERT INTO public.tags (id, name, slug) VALUES ('121e3b5f-eacf-4bac-8ca2-8abf2aebbf80', 'Bonfire', 'bonfire');
INSERT INTO public.tags (id, name, slug) VALUES ('ed8b25b7-c805-4c45-8ee9-c58b83f8cdc2', 'Boss', 'boss');
INSERT INTO public.tags (id, name, slug) VALUES ('c6f0fa77-7721-44c2-9429-af8c81e44bcc', 'Brushes', 'brushes');
INSERT INTO public.tags (id, name, slug) VALUES ('211ad259-5e3f-453e-b5a8-a61d705b1ae2', 'Builder', 'builder');
INSERT INTO public.tags (id, name, slug) VALUES ('698a8d1f-e44d-4c6e-b29a-bb194bf4a5bb', 'Building', 'building');
INSERT INTO public.tags (id, name, slug) VALUES ('7ebbab8b-65d4-4ede-8dcd-e4c16ce06485', 'Camera', 'camera');
INSERT INTO public.tags (id, name, slug) VALUES ('28cff8a1-cc83-4922-98ea-b1c0fec0ac4d', 'Car', 'car');
INSERT INTO public.tags (id, name, slug) VALUES ('aa2b1dda-78e5-422c-b248-66f5e9db1772', 'Card', 'card');
INSERT INTO public.tags (id, name, slug) VALUES ('40206a76-2a4c-4551-8d48-3b475615f178', 'Cartoon', 'cartoon');
INSERT INTO public.tags (id, name, slug) VALUES ('394a3c40-3db7-4f8f-a380-644397773b0e', 'Casual', 'casual');
INSERT INTO public.tags (id, name, slug) VALUES ('aa3658b2-32cb-492e-a761-e0f9bd8dc219', 'Character', 'character');
INSERT INTO public.tags (id, name, slug) VALUES ('fec80e42-2073-4a37-ae7a-86c5a1f92369', 'Checkpoint', 'checkpoint');
INSERT INTO public.tags (id, name, slug) VALUES ('2ad801be-6c8f-44bb-a8e5-d60158529734', 'City', 'city');
INSERT INTO public.tags (id, name, slug) VALUES ('348b648d-b2ec-480f-8cf0-2e94d19a4e6f', 'Classic', 'classic');
INSERT INTO public.tags (id, name, slug) VALUES ('c1f46f08-bb05-42d4-8689-f42b0572f8db', 'Cloth', 'cloth');
INSERT INTO public.tags (id, name, slug) VALUES ('eb3dbd3b-dbcf-4156-966e-9b70a17a25ca', 'Code', 'code');
INSERT INTO public.tags (id, name, slug) VALUES ('b348b05a-a16e-4f5c-b0c5-bd3502fa8940', 'Coin', 'coin');
INSERT INTO public.tags (id, name, slug) VALUES ('761cfe6d-2f0c-45a0-b192-898c31c1dce7', 'Combat', 'combat');
INSERT INTO public.tags (id, name, slug) VALUES ('313b82df-adb4-4e94-99ad-d667bd3de0d3', 'Companion', 'companion');
INSERT INTO public.tags (id, name, slug) VALUES ('9a661823-295c-4511-b8fb-08bbb7bb460e', 'Component', 'component');
INSERT INTO public.tags (id, name, slug) VALUES ('635c486e-e8ea-4618-b8d0-64ba5bf4a7f0', 'Configuration', 'configuration');
INSERT INTO public.tags (id, name, slug) VALUES ('3fe2a29d-5939-4537-b517-49683f011eae', 'Construction', 'construction');
INSERT INTO public.tags (id, name, slug) VALUES ('c9910f82-596f-451e-be95-d807d874dfc4', 'Controller', 'controller');
INSERT INTO public.tags (id, name, slug) VALUES ('052ed386-77b8-4504-981f-234e23d57a84', 'Coop', 'coop');
INSERT INTO public.tags (id, name, slug) VALUES ('27048a0e-ee63-41c5-ae1e-a253a3f35378', 'Counter', 'counter');
INSERT INTO public.tags (id, name, slug) VALUES ('1fcf066b-dab7-484d-83be-b3803c0a6f31', 'Crafting', 'crafting');
INSERT INTO public.tags (id, name, slug) VALUES ('9a60a30d-1de1-405a-8b05-f2c0458ce8b5', 'Creator', 'creator');
INSERT INTO public.tags (id, name, slug) VALUES ('06395c25-67a3-4ae4-ac1c-25e915ad09a5', 'Creepy', 'creepy');
INSERT INTO public.tags (id, name, slug) VALUES ('8042a263-e31b-4862-8019-8f9baf7d4993', 'Crt', 'crt');
INSERT INTO public.tags (id, name, slug) VALUES ('636e1a26-b6bb-4182-89c4-cfe4e748d83c', 'Customizable', 'customizable');
INSERT INTO public.tags (id, name, slug) VALUES ('e23d0da4-a969-4894-a2f0-97d745dd0759', 'Damage', 'damage');
INSERT INTO public.tags (id, name, slug) VALUES ('f7bb2f0e-ffb8-458e-8397-b5ca608436d5', 'Decals', 'decals');
INSERT INTO public.tags (id, name, slug) VALUES ('e295fab9-772b-44b7-8c75-35b911f355b8', 'Deck', 'deck');
INSERT INTO public.tags (id, name, slug) VALUES ('6aa2a509-5add-4504-9cbb-06f9b2f52779', 'Dialogue', 'dialogue');
INSERT INTO public.tags (id, name, slug) VALUES ('a3a066e3-ae8a-44e9-b9db-e6030e645459', 'Drivable', 'drivable');
INSERT INTO public.tags (id, name, slug) VALUES ('92e30996-1596-4281-a7c0-b24f2d3b3132', 'Drive', 'drive');
INSERT INTO public.tags (id, name, slug) VALUES ('bcf7b45c-4ec4-4600-afd2-aee621de535a', 'Dynamic', 'dynamic');
INSERT INTO public.tags (id, name, slug) VALUES ('4d1770fc-ed6f-4c94-bf81-50803ef221b2', 'Effect', 'effect');
INSERT INTO public.tags (id, name, slug) VALUES ('bbf76ecc-99ee-4b5a-909b-c1f9c62ddcfa', 'Enemy', 'enemy');
INSERT INTO public.tags (id, name, slug) VALUES ('a18ccda5-22e4-4206-923a-e7bc1409539a', 'Environment', 'environment');
INSERT INTO public.tags (id, name, slug) VALUES ('ca9ad579-a2aa-454d-8914-13382da91bf7', 'Evil', 'evil');
INSERT INTO public.tags (id, name, slug) VALUES ('065918ae-021a-4cf4-bc96-ce173d1cb9cf', 'Fall', 'fall');
INSERT INTO public.tags (id, name, slug) VALUES ('fecf3f21-b4de-48a0-8b68-e69948473d78', 'Fantasy', 'fantasy');
INSERT INTO public.tags (id, name, slug) VALUES ('c1292111-fc30-4c9f-b240-b1047838f762', 'Fight', 'fight');
INSERT INTO public.tags (id, name, slug) VALUES ('eea863cf-2360-4741-a6db-5cb10fb9bd85', 'Fighter', 'fighter');
INSERT INTO public.tags (id, name, slug) VALUES ('35f17e6b-c7dc-470d-acc1-8db9a33b3f67', 'Fighting', 'fighting');
INSERT INTO public.tags (id, name, slug) VALUES ('ed1f51c3-c281-4512-b6aa-025eb042187a', 'First', 'first');
INSERT INTO public.tags (id, name, slug) VALUES ('1a3dccaf-316f-4496-8874-e4c2b176ae37', 'Firstperson', 'firstperson');
INSERT INTO public.tags (id, name, slug) VALUES ('a54dd7a9-7a9a-4af0-bdcb-51461114149f', 'Flipbooks', 'flipbooks');
INSERT INTO public.tags (id, name, slug) VALUES ('39118e4b-7696-4bb5-bf47-83726614fcac', 'Footsteps', 'footsteps');
INSERT INTO public.tags (id, name, slug) VALUES ('a03515a7-d10f-4025-9317-eb03a22b1090', 'Found', 'found');
INSERT INTO public.tags (id, name, slug) VALUES ('ce360588-6fcc-4152-ac70-d9e2979fe35e', 'Fps', 'fps');
INSERT INTO public.tags (id, name, slug) VALUES ('4930ef85-aa16-4a11-9244-3bfeeaab910d', 'Framework', 'framework');
INSERT INTO public.tags (id, name, slug) VALUES ('ccf7536c-acbb-4209-b2e9-a84e534551a2', 'Full', 'full');
INSERT INTO public.tags (id, name, slug) VALUES ('0b1a0750-c720-461d-9d67-4e128f1a34cd', 'Game', 'game');
INSERT INTO public.tags (id, name, slug) VALUES ('96aa3681-7789-4eb4-b055-e98b75ed9551', 'Gameplay', 'gameplay');
INSERT INTO public.tags (id, name, slug) VALUES ('584e03a0-36bb-4acd-86eb-c2bb58949052', 'Gameready', 'game-ready');
INSERT INTO public.tags (id, name, slug) VALUES ('74d092a2-1bb6-4086-bacc-07b34b5b4cb5', 'Grind', 'grind');
INSERT INTO public.tags (id, name, slug) VALUES ('68541a06-ca42-463a-81b6-5c2df4af54ab', 'Grinding', 'grinding');
INSERT INTO public.tags (id, name, slug) VALUES ('a53e9c3b-a0d8-4beb-bf1f-515c22121662', 'Grocery', 'grocery');
INSERT INTO public.tags (id, name, slug) VALUES ('135ae363-b381-4c89-aa48-4923b0ca0d29', 'HDRI', 'hdri');
INSERT INTO public.tags (id, name, slug) VALUES ('d1520d36-bf15-412f-843d-976045625c9e', 'Haunted', 'haunted');
INSERT INTO public.tags (id, name, slug) VALUES ('8c974e42-94d6-4659-abf8-648040f86bd5', 'Horror', 'horror');
INSERT INTO public.tags (id, name, slug) VALUES ('2bc5690f-0e65-45a9-a69b-8c9c71da8a3e', 'Hud', 'hud');
INSERT INTO public.tags (id, name, slug) VALUES ('763c0c32-f978-49b3-8302-b6fc3319a8a4', 'Hyper', 'hyper');
INSERT INTO public.tags (id, name, slug) VALUES ('c7751ec0-e173-4c61-8b50-a78f9efea1c1', 'Industrial', 'industrial');
INSERT INTO public.tags (id, name, slug) VALUES ('19f74f15-5bd3-40b7-b52c-07c3dc798c9f', 'Input', 'input');
INSERT INTO public.tags (id, name, slug) VALUES ('4cb1e0e0-b2b9-4fa8-adef-8d67940b606e', 'Interactive', 'interactive');
INSERT INTO public.tags (id, name, slug) VALUES ('6058e79b-fa82-4a90-bfe1-72bc02e36806', 'Interface', 'interface');
INSERT INTO public.tags (id, name, slug) VALUES ('11ea581a-654f-46a0-97a9-de8c7812c58e', 'Inventory', 'inventory');
INSERT INTO public.tags (id, name, slug) VALUES ('f1583983-6593-4aed-b358-d600e3e6a4c8', 'Isometric', 'isometric');
INSERT INTO public.tags (id, name, slug) VALUES ('fa7b1aa4-9e61-4129-a724-dd182908f470', 'Kit', 'kit');
INSERT INTO public.tags (id, name, slug) VALUES ('ebd738fb-b116-44f2-ae32-2069a2b7d269', 'Learning', 'learning');
INSERT INTO public.tags (id, name, slug) VALUES ('e278c873-c5f9-4f4c-8201-9cb4a317e444', 'Like', 'like');
INSERT INTO public.tags (id, name, slug) VALUES ('9fc08e8b-e417-4726-b2c1-176ffcdeb316', 'Liminal', 'liminal');
INSERT INTO public.tags (id, name, slug) VALUES ('4df18aed-24eb-46f1-9c36-f316471c1f7c', 'Load', 'load');
INSERT INTO public.tags (id, name, slug) VALUES ('41701211-40fa-4557-b556-4b7119808fd7', 'Loop', 'loop');
INSERT INTO public.tags (id, name, slug) VALUES ('358f8b1e-101c-47a0-b8bd-f0a0e8280308', 'Lowpoly', 'lowpoly');
INSERT INTO public.tags (id, name, slug) VALUES ('c56c9857-f165-4c4d-9607-f8b2e6c71582', 'Magic', 'magic');
INSERT INTO public.tags (id, name, slug) VALUES ('b4d3db75-c84a-4fce-ae79-697672cb8891', 'Management', 'management');
INSERT INTO public.tags (id, name, slug) VALUES ('c0cd9cfb-e211-41d8-bb67-59fa17231622', 'Manager', 'manager');
INSERT INTO public.tags (id, name, slug) VALUES ('7cdf691d-06b5-4aa1-901b-3527936fac5d', 'Map', 'map');
INSERT INTO public.tags (id, name, slug) VALUES ('44b7e2bc-7262-44da-95b5-d642baf8d833', 'Market', 'market');
INSERT INTO public.tags (id, name, slug) VALUES ('20ceb07c-4ba1-43d5-ab7f-63328281e188', 'Material', 'material');
INSERT INTO public.tags (id, name, slug) VALUES ('7976255a-023f-41d7-871b-23c0aa7a05e2', 'Melee', 'melee');
INSERT INTO public.tags (id, name, slug) VALUES ('731b1213-a59a-4e00-bea8-1e7a8b437c57', 'Menu', 'menu');
INSERT INTO public.tags (id, name, slug) VALUES ('635cac04-20db-4dc1-bfac-90a04e350711', 'Metasounds', 'metasounds');
INSERT INTO public.tags (id, name, slug) VALUES ('a1bed82f-9170-41eb-b4d0-38bbe3f24b80', 'Minimalist', 'minimalist');
INSERT INTO public.tags (id, name, slug) VALUES ('c00f4f55-aaba-4e5f-b1de-484b0c23197e', 'Mmo', 'mmo');
INSERT INTO public.tags (id, name, slug) VALUES ('960e92f2-8620-41d4-b89e-ce1f36c050d5', 'Mmorpg', 'mmorpg');
INSERT INTO public.tags (id, name, slug) VALUES ('8c301981-601b-46c8-89c4-f11567f94d3a', 'Modern', 'modern');
INSERT INTO public.tags (id, name, slug) VALUES ('cfbae083-6cab-499b-a82b-3ac5f2768976', 'Modular', 'modular');
INSERT INTO public.tags (id, name, slug) VALUES ('96a39377-3cc0-419b-8bd7-3fe9a7476b29', 'Movement', 'movement');
INSERT INTO public.tags (id, name, slug) VALUES ('8dfb2f75-0a0c-4875-bde3-38622c924000', 'Multiplayer', 'multiplayer');
INSERT INTO public.tags (id, name, slug) VALUES ('df010f89-a0da-4540-8a6f-563972364f3d', 'Music', 'music');
INSERT INTO public.tags (id, name, slug) VALUES ('65c8d999-6e0a-44bc-813a-c5165eef2b00', 'Mysterious', 'mysterious');
INSERT INTO public.tags (id, name, slug) VALUES ('c56c945a-db5f-4c14-9a0f-3b3ab97d9240', 'Node', 'node');
INSERT INTO public.tags (id, name, slug) VALUES ('42bbe9c1-781f-48d3-995e-113b5b481572', 'Npc', 'npc');
INSERT INTO public.tags (id, name, slug) VALUES ('e5e69061-60e2-4fcb-b57a-8ba125d11f6a', 'Old', 'old');
INSERT INTO public.tags (id, name, slug) VALUES ('0bc47dca-9f61-4418-a23d-3eb1783b4aa6', 'Online', 'online');
INSERT INTO public.tags (id, name, slug) VALUES ('3eb18a87-12b9-461d-bb44-600f6da8098b', 'Open', 'open');
INSERT INTO public.tags (id, name, slug) VALUES ('1b5751d6-4f1d-412a-9f22-98d93f5c459a', 'Optimized', 'optimized');
INSERT INTO public.tags (id, name, slug) VALUES ('54e053bd-786b-42d0-bad7-5be1130a93b0', 'Organizer', 'organizer');
INSERT INTO public.tags (id, name, slug) VALUES ('327ad26e-635c-47bf-a4bd-e5fe0767fc2e', 'Pack', 'pack');
INSERT INTO public.tags (id, name, slug) VALUES ('43d69276-b982-4089-855e-8cc286adf584', 'Paper', 'paper');
INSERT INTO public.tags (id, name, slug) VALUES ('2cff2272-1ace-4009-8dd7-3008690e01db', 'Parallax', 'parallax');
INSERT INTO public.tags (id, name, slug) VALUES ('63a44707-b390-47e5-8a91-77b595881e9a', 'Park', 'park');
INSERT INTO public.tags (id, name, slug) VALUES ('f70c0572-274f-445d-b1de-de602a265a52', 'Parkour', 'parkour');
INSERT INTO public.tags (id, name, slug) VALUES ('3bb9655a-8e3b-477e-ba76-59990fed3507', 'Particle', 'particle');
INSERT INTO public.tags (id, name, slug) VALUES ('95245388-f134-4a28-ab3d-ce19aaa83ef8', 'Person', 'person');
INSERT INTO public.tags (id, name, slug) VALUES ('affa394e-24e1-439f-9184-aa50c8278534', 'Planet', 'planet');
INSERT INTO public.tags (id, name, slug) VALUES ('e0bcbff7-c1ae-42c3-b476-4d1b487dd814', 'Plant', 'plant');
INSERT INTO public.tags (id, name, slug) VALUES ('22c921ff-701e-4ba7-8d91-a3ce697bf3b4', 'Platform', 'platform');
INSERT INTO public.tags (id, name, slug) VALUES ('6269e23c-b107-4f6a-a116-2bb89c97e43f', 'Platformer', 'platformer');
INSERT INTO public.tags (id, name, slug) VALUES ('abfbce18-a996-4e99-9405-f885b23b5078', 'Presentation', 'presentation');
INSERT INTO public.tags (id, name, slug) VALUES ('78700a7e-d6e4-407f-af30-2807a1060247', 'Procedural', 'procedural');
INSERT INTO public.tags (id, name, slug) VALUES ('fe489f39-b7cb-40c1-9c68-e0950cdb357c', 'Project', 'project');
INSERT INTO public.tags (id, name, slug) VALUES ('9720f154-7eb9-46e4-89d0-eb3999e31ea7', 'Psycho', 'psycho');
INSERT INTO public.tags (id, name, slug) VALUES ('8b9ede8e-cf33-4052-a9b4-91f708f74ff1', 'Pvp', 'pvp');
INSERT INTO public.tags (id, name, slug) VALUES ('880e2875-9e9f-47ef-bdba-896fbe43642c', 'Quest', 'quest');
INSERT INTO public.tags (id, name, slug) VALUES ('667c46d5-ce21-406d-b2be-6c3c06be26bb', 'Race', 'race');
INSERT INTO public.tags (id, name, slug) VALUES ('9d4bbe69-04d0-4b2f-a918-3a561bc06507', 'Racecar', 'race-car');
INSERT INTO public.tags (id, name, slug) VALUES ('8e108a21-50f2-43a3-a207-ba77bfff9066', 'Racer', 'racer');
INSERT INTO public.tags (id, name, slug) VALUES ('32daf7a1-e43f-4a70-9f0a-e4ac80801846', 'Racing', 'racing');
INSERT INTO public.tags (id, name, slug) VALUES ('9defbcc8-bac8-413f-8ec9-6eaed734489d', 'Rage', 'rage');
INSERT INTO public.tags (id, name, slug) VALUES ('3fa7d3de-5e31-4a1a-8ed0-56bb4be30edc', 'Rail', 'rail');
INSERT INTO public.tags (id, name, slug) VALUES ('dc71961f-5298-4036-a551-0a3ad661c52a', 'Realistic', 'realistic');
INSERT INTO public.tags (id, name, slug) VALUES ('68760db1-379f-478a-881f-ecedd76398fd', 'Replicated', 'replicated');
INSERT INTO public.tags (id, name, slug) VALUES ('16d56f85-181e-4d21-897b-1fd5f2dcb432', 'Resident', 'resident');
INSERT INTO public.tags (id, name, slug) VALUES ('a9be4a40-fbe2-46b6-988b-63d13ddd1bf8', 'Retro', 'retro');
INSERT INTO public.tags (id, name, slug) VALUES ('976902c4-6586-4341-a442-46409e834fd8', 'Rogue', 'rogue');
INSERT INTO public.tags (id, name, slug) VALUES ('e3cdab2e-d7df-44fd-8db2-cd05ca050e76', 'Roleplay', 'roleplay');
INSERT INTO public.tags (id, name, slug) VALUES ('19e890e5-1ca5-40eb-9b10-1ae4058472bb', 'Rollercoaster', 'rollercoaster');
INSERT INTO public.tags (id, name, slug) VALUES ('8f86461c-b3ba-42f0-b059-bcf3f475b182', 'Rpg', 'rpg');
INSERT INTO public.tags (id, name, slug) VALUES ('31149da7-3f1d-4ffd-a174-a8cd345f08bf', 'Runner', 'runner');
INSERT INTO public.tags (id, name, slug) VALUES ('11cf9976-d828-4dbd-992b-75bf9eae178b', 'Sale', 'sale');
INSERT INTO public.tags (id, name, slug) VALUES ('e6cfb6ef-0618-406a-a441-33201695f519', 'Sandbox', 'sandbox');
INSERT INTO public.tags (id, name, slug) VALUES ('ddc8d83a-a64e-42f9-87cd-de2771a536dd', 'Save', 'save');
INSERT INTO public.tags (id, name, slug) VALUES ('1b791242-b74c-456e-9f6f-3e33fe6ad26d', 'Scary', 'scary');
INSERT INTO public.tags (id, name, slug) VALUES ('4deef0ae-8323-40a9-bfe4-e309d33af7e3', 'Script', 'script');
INSERT INTO public.tags (id, name, slug) VALUES ('fc195cdc-fa2f-4767-bfa8-d371d90d5bff', 'Scroll', 'scroll');
INSERT INTO public.tags (id, name, slug) VALUES ('6f9f4071-ad67-4ef6-afd5-3c9e3b208725', 'Shaders', 'shaders');
INSERT INTO public.tags (id, name, slug) VALUES ('036881ba-abb1-442f-b177-22df26db2455', 'Shelf', 'shelf');
INSERT INTO public.tags (id, name, slug) VALUES ('5b11a5c6-a40d-4b16-a801-2ffa0ec23191', 'Shooter', 'shooter');
INSERT INTO public.tags (id, name, slug) VALUES ('9e28f2ab-aabd-4ae3-94ea-8b8b65cae6ae', 'Shop', 'shop');
INSERT INTO public.tags (id, name, slug) VALUES ('a5cb02a5-c54a-41d1-bfe4-d81b419b30cf', 'Shopping', 'shopping');
INSERT INTO public.tags (id, name, slug) VALUES ('1d3fded8-9c3f-4eb4-a5b5-e6d7517505d3', 'Side', 'side');
INSERT INTO public.tags (id, name, slug) VALUES ('ad302652-cd88-4066-8cd6-6939ec1c807f', 'Simulation', 'simulation');
INSERT INTO public.tags (id, name, slug) VALUES ('601624ef-fb4d-4cfc-88d0-1700ec82b6f7', 'Skate', 'skate');
INSERT INTO public.tags (id, name, slug) VALUES ('1d58ef82-deb0-45ad-81a3-eccba3f19bbc', 'Skateboard', 'skateboard');
INSERT INTO public.tags (id, name, slug) VALUES ('8fc6a3c1-cf01-415f-8a22-f6b59bf713cf', 'Skater', 'skater');
INSERT INTO public.tags (id, name, slug) VALUES ('77138e65-7901-4b60-bc12-a13da9eff325', 'Skill', 'skill');
INSERT INTO public.tags (id, name, slug) VALUES ('38d50d79-b637-44c1-a90c-813555edb646', 'SoundEffect', 'sound-effect');
INSERT INTO public.tags (id, name, slug) VALUES ('e02267ea-6b14-4f41-98d8-256a2bd9588d', 'Spell', 'spell');
INSERT INTO public.tags (id, name, slug) VALUES ('93944c75-81c0-493b-a0f6-fe8c61ee6da0', 'Spline', 'spline');
INSERT INTO public.tags (id, name, slug) VALUES ('b259dd52-5181-4f6e-88d8-e77d569acbdb', 'Sprites', 'sprites');
INSERT INTO public.tags (id, name, slug) VALUES ('065286b3-eff6-49cd-a388-737393c7d544', 'Start', 'start');
INSERT INTO public.tags (id, name, slug) VALUES ('a64348dc-e337-4f59-aee9-7d7c26409e64', 'Starter', 'starter');
INSERT INTO public.tags (id, name, slug) VALUES ('c49d682c-73b1-4232-af6f-794d3cac02ad', 'Startup', 'startup');
INSERT INTO public.tags (id, name, slug) VALUES ('f42aa0bc-2b08-4560-8347-30a0696344a7', 'Steam', 'steam');
INSERT INTO public.tags (id, name, slug) VALUES ('34632583-5e1d-4592-aaa6-bdedc291c38f', 'Storage', 'storage');
INSERT INTO public.tags (id, name, slug) VALUES ('22782b2f-3a3d-4791-8e8b-4be3d73f59df', 'Store', 'store');
INSERT INTO public.tags (id, name, slug) VALUES ('bcfbdfeb-302f-4095-b723-cde3a5d75f1d', 'Street', 'street');
INSERT INTO public.tags (id, name, slug) VALUES ('3104813d-7862-42d5-90ca-76bfc7fa2781', 'Stumble', 'stumble');
INSERT INTO public.tags (id, name, slug) VALUES ('22cb5dc2-4017-4481-8702-2b98aff17b2e', 'Stylized', 'stylized');
INSERT INTO public.tags (id, name, slug) VALUES ('ea53214e-197c-49ce-ba93-e222262e7c4d', 'Supermarket', 'supermarket');
INSERT INTO public.tags (id, name, slug) VALUES ('3726b49e-f745-451a-83a2-69044723725e', 'Survival', 'survival');
INSERT INTO public.tags (id, name, slug) VALUES ('808df7c4-d6a2-47c4-b84a-2f11c0bf85f2', 'Sword', 'sword');
INSERT INTO public.tags (id, name, slug) VALUES ('fda698db-be2d-43a5-80d3-098dbaaa7166', 'System', 'system');
INSERT INTO public.tags (id, name, slug) VALUES ('56021550-8f17-4d90-9076-32c5940869b9', 'Television', 'television');
INSERT INTO public.tags (id, name, slug) VALUES ('9909db89-0248-4dad-9d82-e199f7a9ddde', 'Template', 'template');
INSERT INTO public.tags (id, name, slug) VALUES ('c8488f2e-315d-4c87-8de5-8990cb36b87c', 'Theme', 'theme');
INSERT INTO public.tags (id, name, slug) VALUES ('2ab5fd49-9b09-4450-9fcb-d0d0505690bf', 'Themepark', 'themepark');
INSERT INTO public.tags (id, name, slug) VALUES ('97a1942c-c156-495d-a735-543ca3c1c877', 'Thirdperson', 'third-person');
INSERT INTO public.tags (id, name, slug) VALUES ('7c0d7e8d-dbbc-4faa-97d4-59f9d1746651', 'Thriller', 'thriller');
INSERT INTO public.tags (id, name, slug) VALUES ('9a955438-fb83-4231-9fdb-7c3b99ad518b', 'Thug', 'thug');
INSERT INTO public.tags (id, name, slug) VALUES ('8d59209e-4d63-4955-b9cd-af4bac12019f', 'Toolkit', 'toolkit');
INSERT INTO public.tags (id, name, slug) VALUES ('3badac65-2e26-4344-875d-ae5e704d2892', 'Topdown', 'topdown');
INSERT INTO public.tags (id, name, slug) VALUES ('c82f0d56-ede4-47f5-9c3a-f36e397a5a20', 'Touch', 'touch');
INSERT INTO public.tags (id, name, slug) VALUES ('f13d7cbd-b56f-4b0a-8a75-1b97613acc57', 'Tutorials', 'tutorials');
INSERT INTO public.tags (id, name, slug) VALUES ('860b8ec2-fa1b-48f8-b1bb-905da1584ad1', 'UI', 'ui');
INSERT INTO public.tags (id, name, slug) VALUES ('d918260c-316b-461d-96e2-a445f42f34f1', 'Ultimate', 'ultimate');
INSERT INTO public.tags (id, name, slug) VALUES ('f00c360e-c59d-4f71-a2f9-d7b7ecda93ce', 'Vcr', 'vcr');
INSERT INTO public.tags (id, name, slug) VALUES ('e155c31f-8bf6-4487-92cc-a5cebd8a58d6', 'Vehicle', 'vehicle');
INSERT INTO public.tags (id, name, slug) VALUES ('4be7374b-2f8b-473a-b82e-7b7dc1fa11d5', 'Vfx', 'vfx');
INSERT INTO public.tags (id, name, slug) VALUES ('25500137-1ea5-42fc-8b91-cdb556fb0926', 'Vhs', 'vhs');
INSERT INTO public.tags (id, name, slug) VALUES ('c9e387c6-5d50-4fe2-becb-ebab8f771246', 'Videogame', 'videogame');
INSERT INTO public.tags (id, name, slug) VALUES ('e6909c09-bd0d-44b6-b520-fea05ab3579a', 'Visualization', 'visualization');
INSERT INTO public.tags (id, name, slug) VALUES ('27b2a0ea-f833-4ad3-b2d4-3157e30dd1ec', 'Warehouse', 'warehouse');
INSERT INTO public.tags (id, name, slug) VALUES ('7c1953c9-f661-4093-8543-db55ee64ab7f', 'Wargame', 'wargame');
INSERT INTO public.tags (id, name, slug) VALUES ('0812f3e9-0c7b-462c-bead-901309781d16', 'Weapon', 'weapon');
INSERT INTO public.tags (id, name, slug) VALUES ('554ec3ed-12e4-4c0a-b732-691606ca7507', 'Widget', 'widget');
INSERT INTO public.tags (id, name, slug) VALUES ('57aaad06-d48b-4cca-b24c-774e34d2142c', 'World', 'world');
INSERT INTO public.tags (id, name, slug) VALUES ('0ae5aea8-42fd-4351-af8f-002351117cbe', 'Zoo', 'zoo');

-- Restore every assignment whose slug still exists in the redesigned taxonomy.
UPDATE public.games g
SET category_id = c.id
FROM migration_v5_game_categories old_category
JOIN public.categories c ON c.slug = old_category.slug
WHERE g.id = old_category.game_id;

UPDATE public.assets a
SET category_id = c.id
FROM migration_v5_asset_categories old_category
JOIN public.categories c ON c.slug = old_category.slug
WHERE a.id = old_category.asset_id;

INSERT INTO public.game_tags (game_id, tag_id)
SELECT old_tag.game_id, t.id
FROM migration_v5_game_tags old_tag
JOIN public.tags t ON t.slug = old_tag.slug
ON CONFLICT DO NOTHING;

INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT old_tag.asset_id, t.id
FROM migration_v5_asset_tags old_tag
JOIN public.tags t ON t.slug = old_tag.slug
ON CONFLICT DO NOTHING;

INSERT INTO public.content_collection_categories (collection_id, category_id)
SELECT old_category.collection_id, c.id
FROM migration_v5_collection_categories old_category
JOIN public.categories c ON c.slug = old_category.slug
ON CONFLICT DO NOTHING;

INSERT INTO public.content_collection_tags (collection_id, tag_id)
SELECT old_tag.collection_id, t.id
FROM migration_v5_collection_tags old_tag
JOIN public.tags t ON t.slug = old_tag.slug
ON CONFLICT DO NOTHING;
