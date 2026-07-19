-- Re-seed Tags and Relations to ensure everything is fully linked

SET client_encoding TO 'UTF8';

-- ============================================================
-- 1. Insert Tags (ON CONFLICT DO NOTHING)
-- ============================================================
INSERT INTO public.tags (name, slug) VALUES
  ('Village', 'village'),
  ('Windmill', 'windmill'),
  ('Medieval', 'medieval'),
  ('Castle', 'castle'),
  ('Basilica', 'basilica'),
  ('Byzantine', 'byzantine'),
  ('Ancient', 'ancient'),
  ('Underground', 'underground'),
  ('Splat', 'splat'),
  ('CodePlugin', 'code-plugin'),
  ('Splatter', 'splatter'),
  ('Americana', 'americana'),
  ('Bundle', 'bundle'),
  ('Sphinx', 'sphinx'),
  ('Swimming', 'swimming'),
  ('Anubis', 'anubis'),
  ('Rigid', 'rigid'),
  ('Handpainted', 'handpainted'),
  ('Humanoid', 'humanoid'),
  ('Creature', 'creature'),
  ('Egypt', 'egypt'),
  ('Cat', 'cat'),
  ('EpicSkeleton', 'epic-skeleton'),
  ('Metro', 'metro'),
  ('Fast', 'fast'),
  ('Concrete', 'concrete'),
  ('Scattering', 'scattering'),
  ('Road', 'road'),
  ('Support', 'support'),
  ('Path', 'path'),
  ('Environmental', 'environmental'),
  ('Train', 'train'),
  ('Generator', 'generator'),
  ('Tram', 'tram'),
  ('DynamicMaterials', 'dynamic-materials'),
  ('VertexColors', 'vertex-colors'),
  ('Survival', 'survival'),
  ('Tree', 'tree'),
  ('Manor', 'manor'),
  ('Stone', 'stone'),
  ('Rock', 'rock'),
  ('Royal', 'royal'),
  ('Foliage', 'foliage'),
  ('Mansion', 'mansion'),
  ('Palace', 'palace'),
  ('Anime', 'anime'),
  ('Cartoon', 'cartoon'),
  ('PostApocalyptic', 'post-apocalyptic'),
  ('Lumen', 'lumen'),
  ('Ground', 'ground'),
  ('House', 'house'),
  ('Library', 'library'),
  ('Grunge', 'grunge'),
  ('School', 'school'),
  ('Basalt', 'basalt'),
  ('Cave', 'cave'),
  ('Spacesuit', 'spacesuit'),
  ('Star', 'star'),
  ('Bridge', 'bridge'),
  ('Metal', 'metal'),
  ('Texture', 'texture'),
  ('Starfighter', 'starfighter'),
  ('Trek', 'trek'),
  ('Spacecraft', 'spacecraft'),
  ('Fabric', 'fabric'),
  ('Room', 'room'),
  ('SpaceStation', 'space-station'),
  ('Custom', 'custom'),
  ('Spaceship', 'spaceship'),
  ('Arch', 'arch'),
  ('Coastal', 'coastal'),
  ('Tropical', 'tropical'),
  ('Biome', 'biome'),
  ('Beach', 'beach'),
  ('CoralReef', 'coral-reef'),
  ('Shore', 'shore'),
  ('Starfish', 'starfish'),
  ('Reef', 'reef'),
  ('Sand', 'sand'),
  ('Jungle', 'jungle'),
  ('Palm', 'palm'),
  ('Shell', 'shell'),
  ('Diving', 'diving'),
  ('Fish', 'fish'),
  ('Shark', 'shark'),
  ('RayTracing', 'ray-tracing'),
  ('Seabed', 'seabed'),
  ('Sea', 'sea'),
  ('SeaLife', 'sea-life'),
  ('SeaShell', 'seashell'),
  ('Suburban', 'suburban'),
  ('Cityscape', 'cityscape'),
  ('Urban', 'urban'),
  ('Metropolitan', 'metropolitan'),
  ('Skyscraper', 'skyscraper'),
  ('Zebra', 'zebra'),
  ('Rig', 'rig'),
  ('Abandoned', 'abandoned'),
  ('Mafia', 'mafia'),
  ('Crime', 'crime'),
  ('Rural', 'rural'),
  ('Barn', 'barn'),
  ('Sign', 'sign'),
  ('Campfire', 'campfire'),
  ('Travel', 'travel'),
  ('Wilderness', 'wildness'),
  ('Wagon', 'wagon'),
  ('Crate', 'crate'),
  ('Lantern', 'lantern'),
  ('Camping', 'camping'),
  ('Barrel', 'barrel'),
  ('Tent', 'tent'),
  ('Camp', 'camp'),
  ('Roadside', 'roadside'),
  ('Backpack', 'backpack'),
  ('Permanent', 'permanent'),
  ('Town', 'town'),
  ('Collection', 'collection'),
  ('Zebra Sample', 'zebra-sample'),
  ('Plugin', 'plugin'),
  ('Character', 'character'),
  ('ControlRig', 'control-rig'),
  ('SciFi', 'scifi')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. Link Tags to Assets
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
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', id FROM public.tags WHERE slug IN ('plugin', 'splat', 'code-plugin', 'splatter');

-- Asset 4 (American Village) tags: Village, Americana
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', id FROM public.tags WHERE slug IN ('village', 'americana');

-- Asset 5 (Stylized Egyptian Characters) tags: Character, Pbr, Bundle, Sphinx, Swimming, Lowpoly, Anubis, MMO, Fantasy, GameReady, ThirdPerson, Script, NPC, RPG, Rigid, Handpainted, Stylized, Humanoid, Creature, Egypt, Animal, Controller, Cat, ControlRig, EpicSkeleton
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', id FROM public.tags WHERE slug IN ('character', 'pbr', 'bundle', 'sphinx', 'swimming', 'lowpoly', 'anubis', 'mmo', 'fantasy', 'game-ready', 'third-person', 'script', 'npc', 'rpg', 'rigid', 'handpainted', 'stylized', 'humanoid', 'creature', 'egypt', 'animal', 'controller', 'cat', 'control-rig', 'epic-skeleton');

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
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', id FROM public.tags WHERE slug IN ('spacesuit', 'pbr', 'star', 'lumen', 'bridge', 'modular', 'scifi', 'metal', 'texture', 'starfighter', 'realistic', 'exterior', 'interior', 'trek', 'handcrafted', 'spacecraft', 'control', 'fabric', 'blueprint', 'nanite', 'room', 'space-station', 'custom', 'spaceship');

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
SELECT 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4014', id FROM public.tags WHERE slug IN ('face', 'animation', 'zebra', 'rig', 'control', 'control-rig');

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
-- 3. Verification Query
-- ============================================================
SELECT a.title, count(at.tag_id) 
FROM public.assets a 
LEFT JOIN public.asset_tags at ON at.asset_id = a.id 
GROUP BY a.title 
ORDER BY a.title;
