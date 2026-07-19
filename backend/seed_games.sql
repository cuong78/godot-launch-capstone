-- Seed Games Mock Data Script for GodotLaunch
-- Database: godot_launch

SET client_encoding TO 'UTF8';

-- ============================================================
-- 1. Insert Developers (Authors/Sellers) if not exists
-- ============================================================
INSERT INTO public.users (id, role_id, email, password_hash, full_name, status, face_verified)
VALUES
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f81', '68c3e028-491a-4722-b768-3efbccc06283', 'darksilver@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'Dark Silver Games', 'active', TRUE),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f82', '68c3e028-491a-4722-b768-3efbccc06283', 'carlos@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'CarlosGameDev', 'active', TRUE),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f83', '68c3e028-491a-4722-b768-3efbccc06283', 'driven@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'Driven Games', 'active', TRUE),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f84', '68c3e028-491a-4722-b768-3efbccc06283', 'marcin@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'Marcin Matuszczyk', 'active', TRUE),
  ('c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f85', '68c3e028-491a-4722-b768-3efbccc06283', 'stump@godotlaunch.test', '$2b$12$BHUEEvbXesZMwKrui2bQFe2at9WHEl/rTYKHKsmoFsAnhwhgvpc8K', 'Stump Games', 'active', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Ensure wallets exist for developers
INSERT INTO public.wallets (user_id, balance, currency)
SELECT id, 0.00, 'VND' FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.wallets);

-- ============================================================
-- 2. Insert Custom Tags (ON CONFLICT DO NOTHING)
-- ============================================================
INSERT INTO public.tags (name, slug) VALUES
  ('Resident', 'resident'),
  ('Survival', 'survival'),
  ('Evil', 'evil'),
  ('Modern', 'modern'),
  ('Classic', 'classic'),
  ('Thirdperson', 'thirdperson'),
  ('Inventory', 'inventory'),
  ('Horror', 'horror'),
  ('Open', 'open'),
  ('Adventure', 'adventure'),
  ('Mmorpg', 'mmorpg'),
  ('Action', 'action'),
  ('Template', 'template'),
  ('Modular', 'modular'),
  ('Multiplayer', 'multiplayer'),
  ('Shooter', 'shooter'),
  ('Mmo', 'mmo'),
  ('Advanced', 'advanced'),
  ('Gameready', 'gameready'),
  ('Crafting', 'crafting'),
  ('Framework', 'framework'),
  ('Environment', 'environment'),
  ('Online', 'online'),
  ('Realistic', 'realistic'),
  ('Kit', 'kit'),
  ('Coop', 'coop'),
  ('Sandbox', 'sandbox'),
  ('Hyper', 'hyper'),
  ('Pack', 'pack'),
  ('Blueprint', 'blueprint'),
  ('World', 'world'),
  ('Gpu', 'gpu'),
  ('Save', 'save'),
  ('Toolbag', 'toolbag'),
  ('Pause', 'pause'),
  ('Console', 'console'),
  ('Shader', 'shader'),
  ('Gameplay', 'gameplay'),
  ('Key', 'key'),
  ('Gamepad', 'gamepad'),
  ('Accessibility', 'accessibility'),
  ('Data', 'data'),
  ('Configuration', 'configuration'),
  ('Menu', 'menu'),
  ('Credit', 'credit'),
  ('Audio', 'audio'),
  ('Loading', 'loading'),
  ('Tool', 'tool'),
  ('Toolkit', 'toolkit'),
  ('Userinterface', 'userinterface'),
  ('Toolbox', 'toolbox'),
  ('Umg', 'umg'),
  ('Art', 'art'),
  ('Parallax', 'parallax'),
  ('Enemy', 'enemy'),
  ('Side', 'side'),
  ('Plant', 'plant'),
  ('Coin', 'coin'),
  ('Paper', 'paper'),
  ('Fantasy', 'fantasy'),
  ('Interactive', 'interactive'),
  ('AI', 'ai'),
  ('Npc', 'npc'),
  ('Rogue', 'rogue'),
  ('Platform', 'platform'),
  ('Boss', 'boss'),
  ('Code', 'code'),
  ('Bonfire', 'bonfire'),
  ('Damage', 'damage'),
  ('Character', 'character'),
  ('2DAsset', '2dasset'),
  ('Full', 'full'),
  ('Platformer', 'platformer'),
  ('Runner', 'runner'),
  ('Feature', 'feature'),
  ('Rally', 'rally'),
  ('Rallycar', 'rallycar'),
  ('Lowpoly', 'lowpoly'),
  ('Retro', 'retro'),
  ('Level', 'level'),
  ('Stylized', 'stylized'),
  ('Pixel', 'pixel'),
  ('Vehicle', 'vehicle'),
  ('System', 'system'),
  ('Car', 'car'),
  ('Race', 'race'),
  ('Racing', 'racing'),
  ('Automotive', 'automotive'),
  ('Driving', 'driving'),
  ('Person', 'person'),
  ('Hud', 'hud'),
  ('First', 'first'),
  ('Fps', 'fps'),
  ('Replicated', 'replicated'),
  ('Firstperson', 'firstperson'),
  ('Learning', 'learning'),
  ('Weapon', 'weapon'),
  ('Steam', 'steam'),
  ('Widget', 'widget'),
  ('Visualization', 'visualization'),
  ('Presentation', 'presentation'),
  ('Construction', 'construction'),
  ('Building', 'building'),
  ('Industrial', 'industrial'),
  ('Archviz', 'archviz'),
  ('Architecture', 'architecture'),
  ('City', 'city'),
  ('Touch', 'touch'),
  ('Interface', 'interface'),
  ('Store', 'store'),
  ('Shop', 'shop'),
  ('Warehouse', 'warehouse'),
  ('Build', 'build'),
  ('Sale', 'sale'),
  ('Customizable', 'customizable'),
  ('Shopping', 'shopping'),
  ('Management', 'management'),
  ('Market', 'market'),
  ('Organizer', 'organizer'),
  ('Supermarket', 'supermarket'),
  ('Grocery', 'grocery'),
  ('Storage', 'storage'),
  ('Load', 'load'),
  ('Builder', 'builder'),
  ('Shelf', 'shelf'),
  ('Simulation', 'simulation')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Insert Games
-- ============================================================
DELETE FROM public.games;

-- Game 1: Modern Survival Horror Framework
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f81', -- Dark Silver Games
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f04', -- Action-Adventure
  'Modern Survival Horror Framework',
  'Third-person over-the-shoulder camera inspired by modern survival horror titles. 

Features:
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1601987177651-8edfe6c20009',
  'published',
  'marketplace_listing',
  1200000.00,
  0,
  TRUE,
  'https://github.com/darksilver/survival-horror-framework'
);

-- Game 2: Hyper Multiplayer Survival Template Pro [MST] V4
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f81', -- Dark Silver Games
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f04', -- Action-Adventure
  'Hyper Multiplayer Survival Template Pro [MST] V4',
  'Build your next open-world multiplayer survival MMO with this complete template! Features advanced networking, crafting, and sandbox environment setups.

Features:
- Third-person over-the-shoulder camera inspired by modern survival horror titles
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420',
  'published',
  'marketplace_listing',
  2500000.00,
  0,
  TRUE,
  'https://github.com/darksilver/survival-template-pro'
);

-- Game 3: Ultra Game Template 1.3
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f82', -- CarlosGameDev
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f04', -- Action-Adventure
  'Ultra Game Template 1.3',
  'A comprehensive boilerplate and configuration setup tool for AAA projects, featuring gamepad mapping, accessibility configs, data save managers, and advanced game menu UIs.

Features:
- Third-person over-the-shoulder camera inspired by modern survival horror titles
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e',
  'published',
  'marketplace_listing',
  500000.00,
  0,
  TRUE,
  'https://github.com/carlos/ultra-game-template'
);

-- Game 4: Ultimate Platform 2D
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f82', -- CarlosGameDev
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11', -- Platformer
  'Ultimate Platform 2D',
  'Complete 2D Side-scroller game template with parallax backgrounds, interactive entities, rogue-like components, and pre-built basic AI behaviors.

Features:
- Third-person over-the-shoulder camera inspired by modern survival horror titles
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f',
  'published',
  'marketplace_listing',
  800000.00,
  0,
  TRUE,
  'https://github.com/carlos/ultimate-platform-2d'
);

-- Game 5: Ultimate Runner Template
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f83', -- Driven Games
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11', -- Platformer
  'Ultimate Runner Template',
  'A full endless runner template containing gameplay systems, platform spawning logic, character movement mechanics, and high score database.

Features:
- Third-person over-the-shoulder camera inspired by modern survival horror titles
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5',
  'published',
  'marketplace_listing',
  400000.00,
  0,
  TRUE,
  'https://github.com/driven/ultimate-runner'
);

-- Game 6: Retro Style Rally Pack
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f83', -- Driven Games
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f12', -- Racing
  'Retro Style Rally Pack',
  'A stylized pixel-art style racing template with lowpoly car rigs, dynamic dust and drift particles, and competitive AI racers.

Features:
- Third-person over-the-shoulder camera inspired by modern survival horror titles
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7',
  'published',
  'marketplace_listing',
  1500000.00,
  0,
  TRUE,
  'https://github.com/driven/retro-rally-pack'
);

-- Game 7: Renovate: Vehicle Framework
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f83', -- Driven Games
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f12', -- Racing
  'Renovate: Vehicle Framework',
  'An advanced automotive physics system and vehicle customize toolbox, allowing in-depth driving simulation and parts assembly mechanics.

Features:
- Third-person over-the-shoulder camera inspired by modern survival horror titles
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70',
  'published',
  'marketplace_listing',
  1800000.00,
  0,
  TRUE,
  'https://github.com/driven/vehicle-framework'
);

-- Game 8: Third Person Shooter Kit v2.2
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f84', -- Marcin Matuszczyk
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f02', -- Shooter
  'Third Person Shooter Kit v2.2',
  'High-fidelity third-person combat toolkit including cover system, target lock, procedural hit reactions, and custom weapon attributes.

Features:
- Third-person over-the-shoulder camera inspired by modern survival horror titles
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1552820728-8b83bb6b773f',
  'published',
  'marketplace_listing',
  2200000.00,
  0,
  TRUE,
  'https://github.com/marcin/tps-kit'
);

-- Game 9: FPS Multiplayer Template 6
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f85', -- Stump Games
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f02', -- Shooter
  'FPS Multiplayer Template 6',
  'Steam integration ready, replicated FPS template with weapon switching, ammunition, matchmaking, and basic multiplayer lobby UI.

Features:
- Third-person over-the-shoulder camera inspired by modern survival horror titles
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e',
  'published',
  'marketplace_listing',
  2000000.00,
  0,
  TRUE,
  'https://github.com/stump/fps-template-6'
);

-- Game 10: ArchViz Explorer
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f85', -- Stump Games
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f13', -- Simulation
  'ArchViz Explorer',
  'Interactive architectural visualization sandbox. Tour high-fidelity modern structures, toggle furniture configurations, and customize textures in real time.

Features:
- Third-person over-the-shoulder camera inspired by modern survival horror titles
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
  'published',
  'marketplace_listing',
  1100000.00,
  0,
  TRUE,
  'https://github.com/stump/archviz-explorer'
);

-- Game 11: Replicated Store Simulator Template
INSERT INTO public.games (id, creator_id, category_id, title, description, thumbnail_url, status, publishing_type, price_proposed, download_count, is_source_listed, github_repo_url)
VALUES (
  'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011',
  'c0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f85', -- Stump Games
  'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f13', -- Simulation
  'Replicated Store Simulator Template',
  'Build your own supermarket management multiplayer game. Manage shelf stocking, NPC customers, catalog pricing, and inventory organizer.

Features:
- Third-person over-the-shoulder camera inspired by modern survival horror titles
- Supports UE5 and MetaHuman Skeletons (Third-Person Characters)
- Optional standalone first-person mode for developers building first-person survival horror experiences (not an automatic camera switch)
- First-Person Arm is based on the UE4 Skeleton
- Modified GASP Motion Matching
- Grid-Based Inventory System with Multi-Slot Items (Survival Horror Style)
- Fully featured storage box system
- Item inspection system with readable files and 3D inspectable objects
- Advanced door system with multiple door states
- Advanced Merchant System
- Multiple lock mechanisms, including keys, keycards, codes, chains, and more
- Context-aware interaction system based on player focus
- Advanced save and load system
- Location-based music system with smooth transitions
- Four weapons: pipe, pistol, rifle, and shotgun.
- Breakable crates with item drop integration
- Clean and professional UI
- Advanced in-game map system with progression tracking
- Full support for keyboard and Xbox gamepad with automatic input detection
- Enemy AI System (Roaming, Patrolling, Hearing, Vision, Chase, Attack)
- Zombie Grab & Bite System with QTE (Animation NOT Included - Requires Your Own Animation)
- Flashlight system
- Ladder climbing
- Drawer and weapon lockers
- Narrow space traversal
- Inventory Expansion System (Upgrade via Backpack Pickups)
- Laser Sight System',
  'https://images.unsplash.com/photo-1542838132-92c53300491e',
  'published',
  'marketplace_listing',
  1600000.00,
  0,
  TRUE,
  'https://github.com/stump/store-simulator'
);

-- ============================================================
-- 4. Insert Game Tags relations
-- ============================================================
DELETE FROM public.game_tags;

-- Game 1 tags: Resident, Survival, Evil, Modern, Classic, Thirdperson, Inventory, Horror
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', id FROM public.tags WHERE slug IN ('resident', 'survival', 'evil', 'modern', 'classic', 'thirdperson', 'inventory', 'horror');

-- Game 2 tags: Open, Adventure, Mmorpg, Survival, Action, Template, Modular, Multiplayer, Shooter, Mmo, Advanced, Gameready, Crafting, Framework, Environment, Online, Realistic, Kit, Coop, Sandbox, Hyper, Pack, Inventory, Blueprint, World
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', id FROM public.tags WHERE slug IN ('open', 'adventure', 'mmorpg', 'survival', 'action', 'template', 'modular', 'multiplayer', 'shooter', 'mmo', 'advanced', 'gameready', 'crafting', 'framework', 'environment', 'online', 'realistic', 'kit', 'coop', 'sandbox', 'hyper', 'pack', 'inventory', 'blueprint', 'world');

-- Game 3 tags: Gpu, Save, Toolbag, Pause, Template, Console, Shader, Modular, Gameplay, Key, Gamepad, Accessibility, Data, Configuration, Menu, Framework, Credit, Audio, Loading, Tool, Blueprint, Toolkit, Userinterface, Toolbox, Umg
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', id FROM public.tags WHERE slug IN ('gpu', 'save', 'toolbag', 'pause', 'template', 'console', 'shader', 'modular', 'gameplay', 'key', 'gamepad', 'accessibility', 'data', 'configuration', 'menu', 'framework', 'credit', 'audio', 'loading', 'tool', 'blueprint', 'toolkit', 'userinterface', 'toolbox', 'umg');

-- Game 4 tags: Art, Parallax, Action, Enemy, Template, Side, Plant, Coin, Paper, Fantasy, Gameready, Interactive, AI, Npc, Kit, Pack, Blueprint, Rogue, Platform, Boss, Code, Bonfire, Damage, Character, 2DAsset
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', id FROM public.tags WHERE slug IN ('art', 'parallax', 'action', 'enemy', 'template', 'side', 'plant', 'coin', 'paper', 'fantasy', 'gameready', 'interactive', 'ai', 'npc', 'kit', 'pack', 'blueprint', 'rogue', 'platform', 'boss', 'code', 'bonfire', 'damage', 'character', '2dasset');

-- Game 5 tags: Template, Full, Gameplay, Platformer, Runner, Blueprint, Feature
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', id FROM public.tags WHERE slug IN ('template', 'full', 'gameplay', 'platformer', 'runner', 'blueprint', 'feature');

-- Game 6 tags: Blueprint, Rally, Rallycar, Lowpoly, Retro, Gameready, Environment, Level, Stylized, Pixel
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', id FROM public.tags WHERE slug IN ('blueprint', 'rally', 'rallycar', 'lowpoly', 'retro', 'gameready', 'environment', 'level', 'stylized', 'pixel');

-- Game 7 tags: Vehicle, System, Car, Race, Template, Racing, Framework, Automotive, Driving, Blueprint
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', id FROM public.tags WHERE slug IN ('vehicle', 'system', 'car', 'race', 'template', 'racing', 'framework', 'automotive', 'driving', 'blueprint');

-- Game 8 tags: Person, Shooter, Thirdperson, AI, Hud, Blueprint
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', id FROM public.tags WHERE slug IN ('person', 'shooter', 'thirdperson', 'ai', 'hud', 'blueprint');

-- Game 9 tags: First, Fps, Person, Replicated, Template, Multiplayer, Shooter, Firstperson, Learning, Thirdperson, AI, Weapon, Blueprint, Steam, Toolkit
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', id FROM public.tags WHERE slug IN ('first', 'fps', 'person', 'replicated', 'template', 'multiplayer', 'shooter', 'firstperson', 'learning', 'thirdperson', 'ai', 'weapon', 'blueprint', 'steam', 'toolkit');

-- Game 10 tags: Widget, Visualization, Menu, Interactive, Presentation, Realistic, Construction, Building, Industrial, Archviz, Architecture, Blueprint, City, Touch, Interface
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', id FROM public.tags WHERE slug IN ('widget', 'visualization', 'menu', 'interactive', 'presentation', 'realistic', 'construction', 'building', 'industrial', 'archviz', 'architecture', 'blueprint', 'city', 'touch', 'interface');

-- Game 11 tags: Store, Shop, Save, Warehouse, Replicated, Build, Sale, Customizable, Multiplayer, Modern, Shopping, Management, Market, Configuration, Interactive, Organizer, Npc, Supermarket, Grocery, Storage, Load, Builder, Blueprint, Shelf, Simulation
INSERT INTO public.game_tags (game_id, tag_id)
SELECT 'b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', id FROM public.tags WHERE slug IN ('store', 'shop', 'save', 'warehouse', 'replicated', 'build', 'sale', 'customizable', 'multiplayer', 'modern', 'shopping', 'management', 'market', 'configuration', 'interactive', 'organizer', 'npc', 'supermarket', 'grocery', 'storage', 'load', 'builder', 'blueprint', 'shelf', 'simulation');

-- ============================================================
-- 5. Insert Screenshots / Media (5 pictures per game)
-- ============================================================
DELETE FROM public.media WHERE game_id IS NOT NULL;

-- Game 1 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'thumbnail', 'https://images.unsplash.com/photo-1601987177651-8edfe6c20009'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'screenshot', 'https://images.unsplash.com/photo-1601987177651-8edfe6c20009'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'screenshot', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'screenshot', 'https://images.unsplash.com/photo-1542751371-adc38448a05e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'screenshot', 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4001', 'screenshot', 'https://images.unsplash.com/photo-1509228468518-180dd4864904');

-- Game 2 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'thumbnail', 'https://images.unsplash.com/photo-1511512578047-dfb367046420'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'screenshot', 'https://images.unsplash.com/photo-1511512578047-dfb367046420'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'screenshot', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'screenshot', 'https://images.unsplash.com/photo-1542751371-adc38448a05e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'screenshot', 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4002', 'screenshot', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5');

-- Game 3 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'thumbnail', 'https://images.unsplash.com/photo-1542751371-adc38448a05e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'screenshot', 'https://images.unsplash.com/photo-1542751371-adc38448a05e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'screenshot', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'screenshot', 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'screenshot', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4003', 'screenshot', 'https://images.unsplash.com/photo-1511512578047-dfb367046420');

-- Game 4 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'thumbnail', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'screenshot', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'screenshot', 'https://images.unsplash.com/photo-1511512578047-dfb367046420'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'screenshot', 'https://images.unsplash.com/photo-1542751371-adc38448a05e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'screenshot', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4004', 'screenshot', 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f');

-- Game 5 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'thumbnail', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'screenshot', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'screenshot', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'screenshot', 'https://images.unsplash.com/photo-1542751371-adc38448a05e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'screenshot', 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4005', 'screenshot', 'https://images.unsplash.com/photo-1511512578047-dfb367046420');

-- Game 6 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'thumbnail', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'screenshot', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'screenshot', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'screenshot', 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'screenshot', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4006', 'screenshot', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d');

-- Game 7 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'thumbnail', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'screenshot', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'screenshot', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'screenshot', 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'screenshot', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4007', 'screenshot', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d');

-- Game 8 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'thumbnail', 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'screenshot', 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'screenshot', 'https://images.unsplash.com/photo-1542751371-adc38448a05e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'screenshot', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'screenshot', 'https://images.unsplash.com/photo-1511512578047-dfb367046420'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4008', 'screenshot', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc');

-- Game 9 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'thumbnail', 'https://images.unsplash.com/photo-1542751371-adc38448a05e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'screenshot', 'https://images.unsplash.com/photo-1542751371-adc38448a05e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'screenshot', 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'screenshot', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'screenshot', 'https://images.unsplash.com/photo-1511512578047-dfb367046420'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4009', 'screenshot', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc');

-- Game 10 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'thumbnail', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'screenshot', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'screenshot', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'screenshot', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'screenshot', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4010', 'screenshot', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d');

-- Game 11 media
INSERT INTO public.media (game_id, media_type, media_url) VALUES
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'thumbnail', 'https://images.unsplash.com/photo-1542838132-92c53300491e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'screenshot', 'https://images.unsplash.com/photo-1542838132-92c53300491e'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'screenshot', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'screenshot', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'screenshot', 'https://images.unsplash.com/photo-1583258292688-d0213df4a3a8'),
  ('b0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4011', 'screenshot', 'https://images.unsplash.com/photo-1506617405387-88583850c474');

-- ============================================================
-- 6. Verification Query
-- ============================================================
SELECT g.id, g.title, c.name AS category, u.full_name AS author, g.price_proposed, g.status
FROM public.games g
JOIN public.categories c ON c.id = g.category_id
JOIN public.users u ON u.id = g.creator_id
ORDER BY g.title;
