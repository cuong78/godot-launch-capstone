-- Seed Games & Assets Mock Data Script for GodotLaunch
-- Database: godot_launch

SET client_encoding TO 'UTF8';

-- ============================================================
-- 1. Insert Developers (Authors/Sellers)
-- ============================================================
INSERT INTO public.users (id, role_id, email, password_hash, full_name, status, face_verified)
VALUES
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f61', '68c3e028-491a-4722-b768-3efbccc06283', 'stylarts@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'StylArts', 'active', TRUE),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f62', '68c3e028-491a-4722-b768-3efbccc06283', 'walhar.gohar@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'Walhar Gohar', 'active', TRUE),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f63', '68c3e028-491a-4722-b768-3efbccc06283', 'nhance@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'N-Hance Studio', 'active', TRUE),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f64', '68c3e028-491a-4722-b768-3efbccc06283', 'tidalflask@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'Tidal Flask Studios', 'active', TRUE),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f65', '68c3e028-491a-4722-b768-3efbccc06283', 'oleksandr@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'Oleksandr Sychov', 'active', TRUE),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f66', '68c3e028-491a-4722-b768-3efbccc06283', 'polyart3d@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'PolyArt3D', 'active', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Ensure wallets exist for all new developers
INSERT INTO public.wallets (user_id, balance, currency)
SELECT id, 0.00, 'VND' FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.wallets);

-- ============================================================
-- 2. Insert Custom Categories
-- ============================================================
INSERT INTO public.categories (id, name, slug, description, parent_id, type)
VALUES
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f40', 'Game Systems', 'game-systems', 'Game systems and mechanics', NULL, 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f50', 'Tutorials & Examples', 'tutorials-examples', 'Tutorials, guides and example projects', NULL, 'asset')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (id, name, slug, description, parent_id, type)
VALUES
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'Environments', '3d-environments-root', '3D Environments', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f20', 'Characters & Creatures', '3d-characters-creatures', '3D Characters and Creatures', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', 'asset')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (id, name, slug, description, parent_id, type)
VALUES
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f02', 'Fantasy', '3d-env-fantasy', 'Fantasy environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f03', 'Historical', '3d-env-historical', 'Historical environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f04', 'Towns & Villages', '3d-env-towns-villages', 'Towns and villages environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f05', 'Educational', '3d-env-educational', 'Educational environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', 'Dungeon', '3d-env-dungeon', 'Dungeon environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f07', 'Sci-Fi', '3d-env-sci-fi', 'Sci-Fi environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f08', 'Island', '3d-env-island', 'Island environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f09', 'Aquatic', '3d-env-aquatic', 'Aquatic environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f10', 'Cities', '3d-env-cities', 'Cities environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11', 'Farm', '3d-env-farm', 'Farm environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset'),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f12', 'Forest & Jungle', '3d-env-forest-jungle', 'Forest and jungle environments', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'asset')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (id, name, slug, description, parent_id, type)
VALUES
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f21', 'Creatures & Monsters', '3d-creatures-monsters', 'Creatures and monsters models', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f20', 'asset')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (id, name, slug, description, parent_id, type)
VALUES
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f30', 'Engine Tools', 'plugin-engine-tools', 'Godot engine tools and add-ons', 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f15', 'asset')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (id, name, slug, description, parent_id, type)
VALUES
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f41', 'Procedural Systems', 'sys-procedural', 'Procedural game systems', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f40', 'asset')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (id, name, slug, description, parent_id, type)
VALUES
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f51', 'Tools', 'tutorials-tools', 'Tutorial tools and frameworks', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f50', 'asset')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (id, name, slug, description, parent_id, type)
VALUES
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f52', 'Unreal Engine', 'tutorials-unreal-engine', 'Unreal Engine guides and tools', 'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f51', 'asset')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. Insert Custom Tags (Make sure they all exist)
-- ============================================================
INSERT INTO public.tags (id, name, slug) VALUES
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01', 'Village', 'village'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f02', 'Windmill', 'windmill'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f03', 'Medieval', 'medieval'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f04', 'Castle', 'castle'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f05', 'Basilica', 'basilica'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', 'Byzantine', 'byzantine'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f07', 'Ancient', 'ancient'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f08', 'Underground', 'underground'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f09', 'Splat', 'splat'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f10', 'CodePlugin', 'code-plugin'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11', 'Splatter', 'splatter'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f12', 'Americana', 'americana'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f13', 'Bundle', 'bundle'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f14', 'Sphinx', 'sphinx'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f15', 'Swimming', 'swimming'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f16', 'Anubis', 'anubis'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f17', 'Rigid', 'rigid'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f18', 'Handpainted', 'handpainted'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f19', 'Humanoid', 'humanoid'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f20', 'Creature', 'creature'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f21', 'Egypt', 'egypt'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f22', 'Cat', 'cat'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f23', 'EpicSkeleton', 'epic-skeleton'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f24', 'Metro', 'metro'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f25', 'Fast', 'fast'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f26', 'Concrete', 'concrete'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f27', 'Scattering', 'scattering'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f28', 'Road', 'road'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f29', 'Support', 'support'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f30', 'Path', 'path'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f31', 'Environmental', 'environmental'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f32', 'Train', 'train'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f33', 'Generator', 'generator'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f34', 'Tram', 'tram'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f35', 'DynamicMaterials', 'dynamic-materials'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f36', 'VertexColors', 'vertex-colors'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f37', 'Survival', 'survival'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f38', 'Tree', 'tree'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f39', 'Manor', 'manor'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f40', 'Stone', 'stone'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f41', 'Rock', 'rock'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f42', 'Royal', 'royal'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f43', 'Foliage', 'foliage'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f44', 'Mansion', 'mansion'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f45', 'Palace', 'palace'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f46', 'Anime', 'anime'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f47', 'Cartoon', 'cartoon'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f48', 'PostApocalyptic', 'post-apocalyptic'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f49', 'Lumen', 'lumen'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f50', 'Ground', 'ground'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f51', 'House', 'house'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f52', 'Library', 'library'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f53', 'Grunge', 'grunge'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f54', 'School', 'school'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f55', 'Basalt', 'basalt'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f56', 'Cave', 'cave'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f57', 'Spacesuit', 'spacesuit'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f58', 'Star', 'star'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f59', 'Bridge', 'bridge'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f60', 'Metal', 'metal'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f61', 'Texture', 'texture'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f62', 'Starfighter', 'starfighter'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f63', 'Trek', 'trek'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f64', 'Spacecraft', 'spacecraft'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f65', 'Fabric', 'fabric'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f66', 'Room', 'room'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f67', 'SpaceStation', 'space-station'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f68', 'Custom', 'custom'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f69', 'Spaceship', 'spaceship'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f70', 'Arch', 'arch'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f71', 'Coastal', 'coastal'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f72', 'Tropical', 'tropical'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f73', 'Biome', 'biome'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f74', 'Beach', 'beach'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f75', 'CoralReef', 'coral-reef'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f76', 'Shore', 'shore'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f77', 'Starfish', 'starfish'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f78', 'Reef', 'reef'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f79', 'Sand', 'sand'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f80', 'Jungle', 'jungle'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f81', 'Palm', 'palm'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f82', 'Shell', 'shell'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f83', 'Diving', 'diving'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f84', 'Fish', 'fish'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f85', 'Shark', 'shark'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f86', 'RayTracing', 'ray-tracing'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f87', 'Seabed', 'seabed'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f88', 'Sea', 'sea'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f89', 'SeaLife', 'sea-life'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f90', 'SeaShell', 'seashell'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f91', 'Suburban', 'suburban'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f92', 'Cityscape', 'cityscape'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f93', 'Urban', 'urban'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f94', 'Metropolitan', 'metropolitan'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f95', 'Skyscraper', 'skyscraper'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f96', 'Zebra', 'zebra'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f97', 'Rig', 'rig'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fa1', 'Abandoned', 'abandoned'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fa2', 'Mafia', 'mafia'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fa3', 'Crime', 'crime'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fa4', 'Rural', 'rural'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fa5', 'Barn', 'barn'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fa6', 'Sign', 'sign'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fa7', 'Campfire', 'campfire'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fa8', 'Travel', 'travel'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fa9', 'Wilderness', 'wilderness'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fb0', 'Wagon', 'wagon'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fb1', 'Crate', 'crate'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fb2', 'Lantern', 'lantern'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fb3', 'Camping', 'camping'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fb4', 'Barrel', 'barrel'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fb5', 'Tent', 'tent'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fb6', 'Camp', 'camp'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fb7', 'Roadside', 'roadside'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fb8', 'Backpack', 'backpack'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fb9', 'Permanent', 'permanent'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fc0', 'Town', 'town'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fc1', 'Collection', 'collection'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fc2', 'Zebra Sample', 'zebra-sample')
ON CONFLICT (slug) DO NOTHING;

-- Also add tag_ids for custom tags if they didn't exist in system previously
INSERT INTO public.tags (id, name, slug) VALUES
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fc3', 'Plugin', 'plugin'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fc4', 'CodePlugin', 'codeplugin'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fc5', 'Character', 'character'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fc6', 'Anubis', 'anubis'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fc7', 'ControlRig', 'controlrig'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fc8', 'SciFi', 'scifi'),
  ('d0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4fc9', 'SpaceStation', 'spacestation')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. Insert Assets (Marketplace Items)
-- ============================================================
DELETE FROM public.assets;

-- Asset 1: Stylized Mountain Path
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f61', -- StylArts
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f02', -- Fantasy
  'Stylized Mountain Path',
  'Stylized Mountain Path(Modular) is a high-quality, modular asset pack that includes many easy-to-assemble modular building assets and high-quality props. You can quickly iterate between mesh and material variations to populate and polish your game environment.

🏰 Environment Highlights 🌙
A stylized medieval fantasy environment featuring a dramatic hilltop castle, village houses, rocky cliffs, and a windmill.
A winding pathway guides players through the village and naturally leads toward the castle
Modular building pieces allow the environment to be easily expanded, rearranged, and customized.
Distinctive medieval houses with exaggerated silhouettes and detailed wooden architecture.
Layered rock formations, foliage, and environmental details create depth throughout the scene.
Atmospheric nighttime lighting, illuminated windows, fog, and clouds enhance the mysterious fantasy mood.
Designed for gameplay, exploration, cinematic scenes, and fantasy-themed projects.

Demo | Showcase | Walkthrough 

FEATURES:
- High Attention to Details
- Unique Concepts of Assets
- High-Quality Assets
- Game-ready / Optimized
- Controllable parameters in Material Instances

This product includes ULAT ( Ultimate Level Art Tool ) inside. The original price of ULAT for this product was 100$.
Ultimate Level Art Tool (ULAT) allows you to create fast, custom modular buildings.',
  1200000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001/project.zip',
  'active',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb'
);

-- Asset 2: Basilica Cistern
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f61', -- StylArts
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f03', -- Historical
  'Basilica Cistern - Historically Accurate Byzantine Underground Environment',
  'This high-fidelity 3D environment is a meticulous digital historical reconstruction of the famous Basilica Cistern (Yerebatan Sarnıcı) in Istanbul, captured in its raw, ancient Byzantine atmosphere.

Created by 3D Environment Artist İlyas Sözüer, this scene was developed using academic architectural papers, archeological restoration documents, and was artistically inspired by Thomas Allom’s iconic 1840 engraving. Every single column, vault, and architectural asset has been placed according to real-world archeological layouts, giving you an unprecedented level of historical accuracy.

If you are working on a historical documentary, a high-end cinematic project, or a AAA game set in antiquity or the Byzantine era, this optimized, atmospheric underground environment provides the exact mood, depth, and structural realism you need.',
  1800000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002/project.zip',
  'active',
  'https://images.unsplash.com/photo-1578593139836-a579a37a69fb'
);

-- Asset 3: WallGS
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f62', -- Walhar Gohar
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f30', -- Engine Tools
  'WallGS - Gaussian Splat Renderer',
  'Bring Gaussian splats into Unreal Engine 🚀
WallGS is a native Gaussian Splat Renderer for Unreal Engine, built to make large splat scenes easier to import, render, optimize, and use inside real projects.

Import your existing .SOG or .PLY Gaussian splat files directly into the Content Browser, drag them into your level, and experience them in the Unreal viewport and at runtime.

🌐 Website - Documentation - Join Discord Server

✨ What WallGS lets you do:
✅ Import .SOG v2 and binary little-endian .PLY Gaussian splat files
✅ Render Gaussian splats directly in the Unreal viewport and at runtime
✅ Move, rotate, and scale splat actors naturally inside your levels
✅ Adjust rendering quality and optimization settings per actor
✅ Select Spherical Harmonics quality from Degree 0 to Degree 3
✅ Use Adaptive Density to balance visual detail and performance
✅ Set a maximum Splat Budget for predictable rendering workloads
✅ Use Unreal Post Process Volumes for exposure, color grading, and tone mapping
✅ Generate a Static Mesh with complex collision from your splat data
✅ Restrict collision generation to specific areas using WallGS Collision Volumes',
  900000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003/project.zip',
  'active',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4'
);

-- Asset 4: American Village
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f62', -- Walhar Gohar
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f04', -- Towns & Villages
  'American Village Environment ( Modular Exterior Interior )',
  'American Village Environment Build the American suburban town or rural village. This pack provides everything you need to construct a nostalgic neighborhood, anchored by a classic wooden Presbyterian church with a towering steeple and welcoming entrance.

Includes Showcased Preassembled Scene
Ideal for narrative-driven thrillers, nostalgic slice-of-life games, and open-world exploration. Construct sprawling streets lined with traditional multi-story wooden houses, complete with front porches, chain-link fences, and driveways. Populate your roads with authentic infrastructure, including wooden utility poles with overhead power lines and transformers, classic fire hydrants, crosswalks, and vintage parked cars.

The environment is rich with street-level storytelling details to bring your town to life:
- A vintage mint-green bicycle left resting on the curb next to a classic wooden mailbox.
- Fenced-in yards featuring cozy wooden doghouses.
- Paved sidewalks and streets scattered with fallen autumn leaves, puddle decals, and small debris.',
  1500000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004/project.zip',
  'active',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914'
);

-- Asset 5: Stylized Egyptian Characters
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f63', -- N-Hance Studio
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f21', -- Creatures & Monsters
  'Stylized Egyptian Fantasy Characters Pack',
  'This Pack is designed for stylized and fantasy games, perfect for both First and Third Person perspectives.
[UE]Extended Third-Person Controller, [UE]Coloring Material, [UE]IK Rig & Control Rig, [UE] Rigid Physics, Modularity & Various Color Materials for wide customization included.
All assets are optimized for modern pipelines!

Features:
• General:
   ◦ 5 Unique characters
   ◦ 6 Hand-painted color variations(see screenshots for details)
   ◦ Optimized for Modular usage
• PBR Stylized Material:
   ◦ 72 Hand-painted Diffuse Maps
   ◦ 12 Normal Maps
   ◦ 10 Emissive Maps
• Included Characters:
   ◦ Anubis
   ◦ Egyptian Cat
   ◦ Egyptian Ibis Mage
   ◦ Sand Golem
   ◦ Sphinx',
  1000000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005/project.zip',
  'active',
  'https://images.unsplash.com/photo-1600577916048-804c9191e36c'
);

-- Asset 6: AutoEnv
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f63', -- N-Hance Studio
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f41', -- Procedural Systems
  'AutoEnv Procedural Spline Tool',
  'Build complex environments faster than ever in Unreal Engine 5 with AutoEnv Procedural Spline Tool — Powerful procedural spline system with deforming meshes, scattering, pillars, debris etc.

Create procedural roads, walls, bridges, pipelines, fences, wires, trails, and more with this powerful, artist-friendly system. Use features that you want or combine all systems for advanced procedural setups like functional train tracks and much more.

|| All the AutoEnv tools support the following features:
- Advanced material workflow with procedural effects (color, damage, dirt, etc.)
- Performance-friendly instanced mesh output
- Non-destructive workflow with locking / unlocking

This product supports Nanite and Lumen for Unreal Engine 5.',
  1100000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006/project.zip',
  'active',
  'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa'
);

-- Asset 7: FANTASTIC - Highlands Castle
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f64', -- Tidal Flask Studios
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f02', -- Fantasy
  'FANTASTIC - Highlands Castle',
  'One modular kit for building a whole range of fantasy castles - and the dungeons beneath them. Over 200 assets, including modular building parts, props, effects, and customizable shaders.

From a lone highland watchtower to a sprawling clifftop stronghold, from the great hall down to the cellars: every piece works indoors and out, so a single set carries you through all of it.

All in, the pack holds over 200 assets: 142 modular building prefabs, 54 props, plus foliage and cliffs. Models ship with LODs, colliders and custom lightmap UVs, and the foliage is compatible with Unity Terrain and UE Landscape. Shaders let you tint and recolor structures to match your palette, while tileable textures with variants keep large surfaces from repeating.',
  1300000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007/project.zip',
  'active',
  'https://images.unsplash.com/photo-1508849789987-4e5333c12b78'
);

-- Asset 8: Meridian 1988
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f64', -- Tidal Flask Studios
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f05', -- Educational
  'Meridian 1988: Cedar Point School - Modular Environment (VOL 57)',
  'Meridian 1988: Cedar Point School - Modular Environment (VOL 57)
This project includes everything pictured with all assets, maps, and materials created in the Unreal Engine. Each asset was created for realistic AAA quality visuals, style, and budget.

Features:
- 1004 Meshes
- Includes full scene pictured here
- Both Day and Nighttime lighting included
- Includes complex landscape material with auto meshing
- High quality and fidelity texture sets - 4k textures
- Includes fully modeled 1980s police car',
  1600000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008/project.zip',
  'active',
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b'
);

-- Asset 9: Abyssal Grottos Caves
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f65', -- Oleksandr Sychov
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06', -- Dungeon
  'Abyssal Grottos Caves',
  'The Abyssal Grottos collection offers a diverse array of basalt rocks in various sizes and shapes. This set includes static meshes such as rubble piles to fill gaps, pillars for vertical elements, walls, platforms for navigation, large rocks to define spaces, and small pebble piles for added detail, perfect for crafting immersive cave environments.

Prebuilt blueprints are available, fully detailed and ready for immediate use in your cave environments.
Additionally, splines for pillars and walls are available, offering a more versatile approach to constructing cave walls and structures.',
  800000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009/project.zip',
  'active',
  'https://images.unsplash.com/photo-1507163546647-f28af0f1740a'
);

-- Asset 10: FANTASTIC - Highlands Castle (Sci-Fi)
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f64', -- Tidal Flask Studios
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f07', -- Sci-Fi
  'FANTASTIC - Highlands Castle (Sci-Fi Edition)',
  'High-quality Sci-Fi space environment featuring spacecrafts, space stations, bridges and control rooms. Perfect for crafting futuristic scifi projects.
The Abyssal Grottos collection offers a diverse array of basalt rocks in various sizes and shapes. This set includes static meshes such as rubble piles to fill gaps, pillars for vertical elements, walls, platforms for navigation, large rocks to define spaces, and small pebble piles for added detail, perfect for crafting immersive cave environments.
Prebuilt blueprints are available, fully detailed and ready for immediate use in your cave environments.',
  1400000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010/project.zip',
  'active',
  'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9'
);

-- Asset 11: Tropical Beach Biome
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f66', -- PolyArt3D
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f08', -- Island
  'Tropical Beach Biome - Low Poly Stylized Environment',
  'The Abyssal Grottos collection offers a diverse array of basalt rocks in various sizes and shapes. This set includes static meshes such as rubble piles to fill gaps, pillars for vertical elements, walls, platforms for navigation, large rocks to define spaces, and small pebble piles for added detail, perfect for crafting immersive cave environments.

Prebuilt blueprints are available, fully detailed and ready for immediate use in your cave environments.
Additionally, splines for pillars and walls are available, offering a more versatile approach to constructing cave walls and structures.',
  700000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011/project.zip',
  'active',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e'
);

-- Asset 12: Ocean Floor Pack
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4012',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f64', -- Tidal Flask Studios
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f09', -- Aquatic
  'Ocean Floor Pack / High Quality Environment',
  'The Abyssal Grottos collection offers a diverse array of basalt rocks in various sizes and shapes. This set includes static meshes such as rubble piles to fill gaps, pillars for vertical elements, walls, platforms for navigation, large rocks to define spaces, and small pebble piles for added detail, perfect for crafting immersive cave environments.

Prebuilt blueprints are available, fully detailed and ready for immediate use in your cave environments.
Additionally, splines for pillars and walls are available, offering a more versatile approach to constructing cave walls and structures.',
  950000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4012/project.zip',
  'active',
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5'
);

-- Asset 13: Cartoon City Free
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4013',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f64', -- Tidal Flask Studios
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f10', -- Cities
  'Cartoon City Free - Low Poly 3D Models Pack',
  'The Abyssal Grottos collection offers a diverse array of basalt rocks in various sizes and shapes. This set includes static meshes such as rubble piles to fill gaps, pillars for vertical elements, walls, platforms for navigation, large rocks to define spaces, and small pebble piles for added detail, perfect for crafting immersive cave environments.

Prebuilt blueprints are available, fully detailed and ready for immediate use in your cave environments.
Additionally, splines for pillars and walls are available, offering a more versatile approach to constructing cave walls and structures.',
  0.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4013/project.zip',
  'active',
  'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83'
);

-- Asset 14: Zebra Sample
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4014',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f66', -- PolyArt3D
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f52', -- Unreal Engine
  'Zebra Sample - Unreal Engine Rig',
  'The Abyssal Grottos collection offers a diverse array of basalt rocks in various sizes and shapes. This set includes static meshes such as rubble piles to fill gaps, pillars for vertical elements, walls, platforms for navigation, large rocks to define spaces, and small pebble piles for added detail, perfect for crafting immersive cave environments.

Prebuilt blueprints are available, fully detailed and ready for immediate use in your cave environments.
Additionally, splines for pillars and walls are available, offering a more versatile approach to constructing cave walls and structures.',
  200000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4014/project.zip',
  'active',
  'https://images.unsplash.com/photo-1531747118685-ca8fa6e08806'
);

-- Asset 15: 70s Mafia Barn Asset Pack
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4015',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f66', -- PolyArt3D
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11', -- Farm
  '70s Mafia Barn Asset Pack',
  'This asset pack features a highly detailed, modular 70s-style abandoned barn environment alongside a vast collection of thematic props designed for a mafia hideout setting.

These high-quality assets were collaboratively created as part of a 3D environment art challenge by talented community artists and are fully cleared for use.

Features:
- Modular barn architecture (walls, roof, beams)
- Extensive collection of 70s era props (furniture, tools, hideout details)
- Fully assembled and lit Demo Map showcasing the atmospheric potential
- Overview Map with all assets sorted for easy integration
- Game-ready optimization',
  1250000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4015/project.zip',
  'active',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef'
);

-- Asset 16: GanzSe FREE Camping
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4016',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f66', -- PolyArt3D
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f12', -- Forest & Jungle
  'GanzSe FREE Camping - Fantasy Low Poly Props',
  'The Abyssal Grottos collection offers a diverse array of basalt rocks in various sizes and shapes. This set includes static meshes such as rubble piles to fill gaps, pillars for vertical elements, walls, platforms for navigation, large rocks to define spaces, and small pebble piles for added detail, perfect for crafting immersive cave environments.

Prebuilt blueprints are available, fully detailed and ready for immediate use in your cave environments.
Additionally, splines for pillars and walls are available, offering a more versatile approach to constructing cave walls and structures.',
  0.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4016/project.zip',
  'active',
  'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4'
);

-- Asset 17: Zebra Sample (Cities)
INSERT INTO public.assets (id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url)
VALUES (
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4017',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f66', -- PolyArt3D
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f10', -- Cities
  'Zebra Sample - Cities Model',
  'The Abyssal Grottos collection offers a diverse array of basalt rocks in various sizes and shapes. This set includes static meshes such as rubble piles to fill gaps, pillars for vertical elements, walls, platforms for navigation, large rocks to define spaces, and small pebble piles for added detail, perfect for crafting immersive cave environments.

Prebuilt blueprints are available, fully detailed and ready for immediate use in your cave environments.
Additionally, splines for pillars and walls are available, offering a more versatile approach to constructing cave walls and structures.',
  300000.00,
  'mock://marketplace/items/a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4017/project.zip',
  'active',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df'
);

-- ============================================================
-- 5. Insert Asset Tags relations
-- ============================================================
DELETE FROM public.asset_tags;

-- Asset 1 (Stylized Mountain Path) tags: Village, Modular, Fantasy, Windmill, Medieval, Stylized, Castle
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', id FROM public.tags WHERE slug IN ('village', 'modular', 'fantasy', 'windmill', 'medieval', 'stylized', 'castle');

-- Asset 2 (Basilica Cistern) tags: Basilica, Historical, Environment, Realistic, Interior, Byzantine, Architecture, Ancient, Underground
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', id FROM public.tags WHERE slug IN ('basilica', 'historical', 'environment', 'realistic', 'interior', 'byzantine', 'architecture', 'ancient', 'underground');

-- Asset 3 (WallGS) tags: Plugin, Splat, CodePlugin, Splatter
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', id FROM public.tags WHERE slug IN ('plugin', 'splat', 'codeplugin', 'splatter');

-- Asset 4 (American Village) tags: Village, Americana
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', id FROM public.tags WHERE slug IN ('village', 'americana');

-- Asset 5 (Stylized Egyptian Characters) tags: Character, Pbr, Bundle, Sphinx, Swimming, Lowpoly, Anubis, MMO, Fantasy, GameReady, ThirdPerson, Script, NPC, RPG, Rigid, Handpainted, Stylized, Humanoid, Creature, Egypt, Animal, Controller, Cat, ControlRig, EpicSkeleton
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', id FROM public.tags WHERE slug IN ('character', 'pbr', 'bundle', 'sphinx', 'swimming', 'lowpoly', 'anubis', 'mmo', 'fantasy', 'game-ready', 'third-person', 'script', 'npc', 'rpg', 'rigid', 'handpainted', 'stylized', 'humanoid', 'creature', 'egypt', 'animal', 'controller', 'cat', 'controlrig', 'epic-skeleton');

-- Asset 6 (AutoEnv) tags: Nanite, Metro, Fast, Modular, Advanced, GameReady, Procedural, Script, Dynamic, Level, Realistic, Concrete, Scattering, Road, Support, Path, Environmental, Tool, Train, Generator, Spline, Tram, Blueprint, DynamicMaterials, VertexColors
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', id FROM public.tags WHERE slug IN ('nanite', 'metro', 'fast', 'modular', 'advanced', 'game-ready', 'procedural', 'script', 'dynamic', 'level', 'realistic', 'concrete', 'scattering', 'road', 'support', 'path', 'environmental', 'tool', 'train', 'generator', 'spline', 'tram', 'blueprint', 'dynamic-materials', 'vertex-colors');

-- Asset 7 (FANTASTIC - Highlands Castle) tags: Pbr, Survival, Tree, Manor, Stone, Rock, Modular, Royal, Foliage, Mansion, Palace, Fantasy, Anime, Medieval, Cartoon, Environment, Building, Stylized, Castle, Prop, Ancient
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', id FROM public.tags WHERE slug IN ('pbr', 'survival', 'tree', 'manor', 'stone', 'rock', 'modular', 'royal', 'foliage', 'mansion', 'palace', 'fantasy', 'anime', 'medieval', 'cartoon', 'environment', 'building', 'stylized', 'castle', 'prop', 'ancient');

-- Asset 8 (Meridian 1988) tags: Retro, Pbr, PostApocalyptic, Lumen, Ground, Modular, Lowpoly, Modern, House, Library, Environment, Realistic, Exterior, Building, Interior, Grunge, Prop, Nanite, School
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', id FROM public.tags WHERE slug IN ('retro', 'pbr', 'post-apocalyptic', 'lumen', 'ground', 'modular', 'lowpoly', 'modern', 'house', 'library', 'environment', 'realistic', 'exterior', 'building', 'interior', 'grunge', 'prop', 'nanite', 'school');

-- Asset 9 (Abyssal Grottos) tags: Fantasy, Dungeon, Level, Basalt, Cave
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', id FROM public.tags WHERE slug IN ('fantasy', 'dungeon', 'level', 'basalt', 'cave');

-- Asset 10 (FANTASTIC - Sci-Fi) tags: Spacesuit, Pbr, Star, Lumen, Bridge, Modular, SciFi, Metal, Texture, Starfighter, Realistic, Exterior, Interior, Trek, Handcrafted, Spacecraft, Control, Fabric, Blueprint, Nanite, Room, SpaceStation, Custom, Spaceship
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', id FROM public.tags WHERE slug IN ('spacesuit', 'pbr', 'star', 'lumen', 'bridge', 'modular', 'scifi', 'metal', 'texture', 'starfighter', 'realistic', 'exterior', 'interior', 'trek', 'handcrafted', 'spacecraft', 'control', 'fabric', 'blueprint', 'nanite', 'room', 'spacestation', 'custom', 'spaceship');

-- Asset 11 (Tropical Beach Biome) tags: Arch, Adventure, Polygon, Survival, Coastal, Tropical, Rock, PolyArt, Lowpoly, Biome, Beach, CoralReef, Mobile, Shore, Water, Nature, Stylized, Ocean, Starfish, Reef, Island, Sand, Jungle, Palm, Shell
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', id FROM public.tags WHERE slug IN ('arch', 'adventure', 'polygon', 'survival', 'coastal', 'tropical', 'rock', 'polyart', 'lowpoly', 'biome', 'beach', 'coral-reef', 'mobile', 'shore', 'water', 'nature', 'stylized', 'ocean', 'starfish', 'reef', 'island', 'sand', 'jungle', 'palm', 'shell');

-- Asset 12 (Ocean Floor Pack) tags: Diving, Pbr, Underwater, Lighting, Fish, Lumen, Shark, RayTracing, Modular, Lowpoly, Fantasy, Seabed, PhotoRealistic, Sea, SeaLife, Water, Level, Realistic, Ocean, Animal, SeaShell
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4012', id FROM public.tags WHERE slug IN ('diving', 'pbr', 'underwater', 'lighting', 'fish', 'lumen', 'shark', 'ray-tracing', 'modular', 'lowpoly', 'fantasy', 'seabed', 'photorealistic', 'sea', 'sealife', 'water', 'level', 'realistic', 'ocean', 'animal', 'seashell');

-- Asset 13 (Cartoon City Free) tags: Vehicle, Street, Car, Modular, Lowpoly, Suburban, Modern, Fantasy, Cartoon, Cityscape, Supermarket, Road, Exterior, Urban, Metropolitan, Stylized, Environmental, Skyscraper, Prop, Architecture, Park, Character, City
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4013', id FROM public.tags WHERE slug IN ('vehicle', 'street', 'car', 'modular', 'lowpoly', 'suburban', 'modern', 'fantasy', 'cartoon', 'cityscape', 'supermarket', 'road', 'exterior', 'urban', 'metropolitan', 'stylized', 'environmental', 'skyscraper', 'prop', 'architecture', 'park', 'character', 'city');

-- Asset 14 (Zebra Sample - UE) tags: Face, Animation, Zebra, Rig, Control, ControlRig
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4014', id FROM public.tags WHERE slug IN ('face', 'animation', 'zebra', 'rig', 'control', 'controlrig');

-- Asset 15 (70s Mafia Barn) tags: Retro, Abandoned, Mafia, 1970s, Crime, Rural, Modular, Barn, Vintage, Environment, Realistic, Old, Farm
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4015', id FROM public.tags WHERE slug IN ('retro', 'abandoned', 'mafia', '1970s', 'crime', 'rural', 'modular', 'barn', 'vintage', 'environment', 'realistic', 'old', 'farm');

-- Asset 16 (GanzSe FREE Camping) tags: Adventure, Sign, Survival, Campfire, Modular, Travel, Lowpoly, Fantasy, Wilderness, Wagon, Medieval, Crate, Environment, Nature, Lantern, Camping, RPG, Barrel, Tent, Stylized, Camp, Prop, Forest, Roadside, Backpack
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4016', id FROM public.tags WHERE slug IN ('adventure', 'sign', 'survival', 'campfire', 'modular', 'travel', 'lowpoly', 'fantasy', 'wilderness', 'wagon', 'medieval', 'crate', 'environment', 'nature', 'lantern', 'camping', 'rpg', 'barrel', 'tent', 'stylized', 'camp', 'prop', 'forest', 'roadside', 'backpack');

-- Asset 17 (Zebra Sample - Cities) tags: Vehicle, Permanent, Modular, Lowpoly, Town, Level, Building, Collection, Weapon, Character, City
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4017', id FROM public.tags WHERE slug IN ('vehicle', 'permanent', 'modular', 'lowpoly', 'town', 'level', 'building', 'collection', 'weapon', 'character', 'city');

-- ============================================================
-- 6. Insert Screenshots / Media (5 pictures per asset)
-- ============================================================
DELETE FROM public.media;

-- Asset 1 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'thumbnail', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'screenshot', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'screenshot', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'screenshot', 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'screenshot', 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'screenshot', 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d');

-- Asset 2 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'thumbnail', 'https://images.unsplash.com/photo-1578593139836-a579a37a69fb'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'screenshot', 'https://images.unsplash.com/photo-1563911302283-d2bc1db95245'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'screenshot', 'https://images.unsplash.com/photo-1608958416755-f75e7a9e6918'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'screenshot', 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'screenshot', 'https://images.unsplash.com/photo-1578593139836-a579a37a69fb'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'screenshot', 'https://images.unsplash.com/photo-1518005020951-eccb494ad742');

-- Asset 3 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'thumbnail', 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'screenshot', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'screenshot', 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'screenshot', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'screenshot', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'screenshot', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5');

-- Asset 4 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'thumbnail', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'screenshot', 'https://images.unsplash.com/photo-1513694203232-719a280e022f'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'screenshot', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'screenshot', 'https://images.unsplash.com/photo-1570129477492-45c003edd2be'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'screenshot', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'screenshot', 'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09');

-- Asset 5 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'thumbnail', 'https://images.unsplash.com/photo-1600577916048-804c9191e36c'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'screenshot', 'https://images.unsplash.com/photo-1600577916048-804c9191e36c'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'screenshot', 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'screenshot', 'https://images.unsplash.com/photo-1503177119275-0aa32b31d468'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'screenshot', 'https://images.unsplash.com/photo-1504701954957-2390f806e9b4'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'screenshot', 'https://images.unsplash.com/photo-1580640373433-217e53f8e60b');

-- Asset 6 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'thumbnail', 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'screenshot', 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'screenshot', 'https://images.unsplash.com/photo-1509228468518-180dd4864904'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'screenshot', 'https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'screenshot', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'screenshot', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa');

-- Asset 7 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'thumbnail', 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'screenshot', 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'screenshot', 'https://images.unsplash.com/photo-1533105079780-92b9be482077'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'screenshot', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'screenshot', 'https://images.unsplash.com/photo-1524396309943-e03f5db0ac67'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'screenshot', 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375');

-- Asset 8 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'thumbnail', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'screenshot', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'screenshot', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'screenshot', 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'screenshot', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'screenshot', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957');

-- Asset 9 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'thumbnail', 'https://images.unsplash.com/photo-1507163546647-f28af0f1740a'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'screenshot', 'https://images.unsplash.com/photo-1507163546647-f28af0f1740a'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'screenshot', 'https://images.unsplash.com/photo-1576085898323-218337e3343c'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'screenshot', 'https://images.unsplash.com/photo-1518495973542-4542c06a5843'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'screenshot', 'https://images.unsplash.com/photo-1465919292275-c60ad49da6a4'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'screenshot', 'https://images.unsplash.com/photo-1532003885409-ed84d334f6cc');

-- Asset 10 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'thumbnail', 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'screenshot', 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'screenshot', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'screenshot', 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'screenshot', 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'screenshot', 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2');

-- Asset 11 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'thumbnail', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'screenshot', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'screenshot', 'https://images.unsplash.com/photo-1439066615861-d1af74d74000'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'screenshot', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'screenshot', 'https://images.unsplash.com/photo-1546026423-cc4642628d2b'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'screenshot', 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0');

-- Asset 12 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4012', 'thumbnail', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4012', 'screenshot', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4012', 'screenshot', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4012', 'screenshot', 'https://images.unsplash.com/photo-1560275669-46c5a89d7a44'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4012', 'screenshot', 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4012', 'screenshot', 'https://images.unsplash.com/photo-1546026423-cc4642628d2b');

-- Asset 13 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4013', 'thumbnail', 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4013', 'screenshot', 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4013', 'screenshot', 'https://images.unsplash.com/photo-1519501025264-65ba15a82390'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4013', 'screenshot', 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4013', 'screenshot', 'https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4013', 'screenshot', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb');

-- Asset 14 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4014', 'thumbnail', 'https://images.unsplash.com/photo-1531747118685-ca8fa6e08806'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4014', 'screenshot', 'https://images.unsplash.com/photo-1531747118685-ca8fa6e08806'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4014', 'screenshot', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4014', 'screenshot', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4014', 'screenshot', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4014', 'screenshot', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119');

-- Asset 15 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4015', 'thumbnail', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4015', 'screenshot', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4015', 'screenshot', 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4015', 'screenshot', 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4015', 'screenshot', 'https://images.unsplash.com/photo-1486496146582-9ffcd0b2b2b7'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4015', 'screenshot', 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c');

-- Asset 16 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4016', 'thumbnail', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4016', 'screenshot', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4016', 'screenshot', 'https://images.unsplash.com/photo-1510312305653-8ed496efae75'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4016', 'screenshot', 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4016', 'screenshot', 'https://images.unsplash.com/photo-1448375240586-882707db888b'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4016', 'screenshot', 'https://images.unsplash.com/photo-1534447677768-be436bb09401');

-- Asset 17 media
INSERT INTO public.media (asset_id, media_type, media_url) VALUES
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4017', 'thumbnail', 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4017', 'screenshot', 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4017', 'screenshot', 'https://images.unsplash.com/photo-1519501025264-65ba15a82390'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4017', 'screenshot', 'https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4017', 'screenshot', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'),
  ('a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4017', 'screenshot', 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83');

-- ============================================================
-- 7. Verification Query
-- ============================================================
SELECT a.id, a.title, c.name AS category, u.full_name AS author, a.price, a.status
FROM public.assets a
JOIN public.categories c ON c.id = a.category_id
JOIN public.users u ON u.id = a.seller_id
ORDER BY a.title;
