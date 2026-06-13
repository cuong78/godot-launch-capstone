-- Flyway Migration: Add asset categories to categories table
INSERT INTO categories (name, slug) VALUES
('Scripts & Plugins', 'scripts-plugins'),
('Shaders & VFX', 'shaders-vfx'),
('2D Assets', '2d-assets'),
('3D Models', '3d-models'),
('Audio & SFX', 'audio-sfx')
ON CONFLICT (slug) DO NOTHING;
