-- ============================================================
--  V16: Seed translations for Categories and Banners
-- ============================================================

-- 1. Seed Categories translations
UPDATE public.categories SET name_en = 'Action', name_vi = 'Hành động', name_ja = 'アクション', description_en = 'Action games', description_vi = 'Trò chơi hành động', description_ja = 'アクションゲーム' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01';
UPDATE public.categories SET name_en = 'Adventure', name_vi = 'Phiêu lưu', name_ja = 'アドベンチャー', description_en = 'Adventure games', description_vi = 'Trò chơi phiêu lưu', description_ja = 'アドベンチャーゲーム' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f05';
UPDATE public.categories SET name_en = 'Strategy', name_vi = 'Chiến thuật', name_ja = 'ストラテジー', description_en = 'Strategy games', description_vi = 'Trò chơi chiến thuật', description_ja = 'ストラテジーゲーム' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f07';
UPDATE public.categories SET name_en = 'Casual', name_vi = 'Giải trí nhẹ', name_ja = 'カジュアル', description_en = 'Casual games', description_vi = 'Trò chơi giải trí nhẹ', description_ja = 'カジュアルゲーム' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f09';
UPDATE public.categories SET name_en = 'Platformer', name_vi = 'Đi cảnh', name_ja = 'プラットフォーマー', description_en = 'Platformer games', description_vi = 'Trò chơi đi cảnh', description_ja = 'プラットフォーマーゲーム' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11';
UPDATE public.categories SET name_en = 'Racing', name_vi = 'Đua xe', name_ja = 'レース', description_en = 'Racing games', description_vi = 'Trò chơi đua xe', description_ja = 'レースゲーム' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f12';
UPDATE public.categories SET name_en = 'Simulation', name_vi = 'Mô phỏng', name_ja = 'シミュレーション', description_en = 'Simulation games', description_vi = 'Trò chơi mô phỏng', description_ja = 'シミュレーションゲーム' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f13';
UPDATE public.categories SET name_en = 'Sports', name_vi = 'Thể thao', name_ja = 'スポーツ', description_en = 'Sports games', description_vi = 'Trò chơi thể thao', description_ja = 'スポーツゲーム' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f14';
UPDATE public.categories SET name_en = 'Puzzle', name_vi = 'Giải đố', name_ja = 'パズル', description_en = 'Puzzle games', description_vi = 'Trò chơi giải đố', description_ja = 'パズルゲーム' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f15';
UPDATE public.categories SET name_en = '2D Assets', name_vi = 'Tài nguyên 2D', name_ja = '2D アセット', description_en = '2D graphics and sprites', description_vi = 'Hình ảnh và đồ họa 2D', description_ja = '2D グラフィックスとスプライト' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f01';
UPDATE public.categories SET name_en = '3D Assets', name_vi = 'Tài nguyên 3D', name_ja = '3D アセット', description_en = '3D models and objects', description_vi = 'Mô hình và vật thể 3D', description_ja = '3D モデルとオブジェクト' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06';
UPDATE public.categories SET name_en = 'Templates & Source Code', name_vi = 'Template & mã nguồn', name_ja = 'テンプレート & ソースコード', description_en = 'Full game templates and source code projects', description_vi = 'Mẫu game hoàn chỉnh và dự án mã nguồn', description_ja = 'フルゲームテンプレートとソースコードプロジェクト' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f11';
UPDATE public.categories SET name_en = 'Plugins & Add-ons', name_vi = 'Plugin & tiện ích mở rộng', name_ja = 'プラグイン & アドオン', description_en = 'Godot editor plugins and code add-ons', description_vi = 'Plugin cho Godot editor và các tiện ích mở rộng mã nguồn', description_ja = 'Godotエディタプラグインとコードアドオン' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f15';
UPDATE public.categories SET name_en = 'Materials & Shaders', name_vi = 'Material & shader', name_ja = 'マテリアル & シェーダー', description_en = 'Textures, materials, and custom shaders', description_vi = 'Texture, vật liệu và shader tùy chỉnh', description_ja = 'テクスチャ、マテリアル、カスタムシェーダー' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f19';
UPDATE public.categories SET name_en = 'Audio & Music', name_vi = 'Âm thanh & nhạc', name_ja = 'オーディオ & 音楽', description_en = 'Sound effects and music tracks', description_vi = 'Hiệu ứng âm thanh và các bản nhạc', description_ja = '効果音と音楽トラック' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f23';
UPDATE public.categories SET name_en = 'VFX & Animations', name_vi = 'VFX & hoạt ảnh', name_ja = 'VFX & アニメーション', description_en = 'Visual effects and animations', description_vi = 'Hiệu ứng hình ảnh và hoạt ảnh', description_ja = 'ビジュアルエフェクトとアニメーション' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f27';

UPDATE public.categories SET name_en = 'Shooter', name_vi = 'Bắn súng', name_ja = 'シューター' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f02';
UPDATE public.categories SET name_en = 'Fighting', name_vi = 'Đối kháng', name_ja = '対戦格闘' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f03';
UPDATE public.categories SET name_en = 'Action-Adventure', name_vi = 'Hành động - phiêu lưu', name_ja = 'アクションアドベンチャー' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f04';
UPDATE public.categories SET name_en = 'RPG', name_vi = 'Nhập vai', name_ja = 'RPG' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f06';
UPDATE public.categories SET name_en = 'City Builder', name_vi = 'Xây dựng thành phố', name_ja = '都市建設' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f08';
UPDATE public.categories SET name_en = 'Card Game', name_vi = 'Thẻ bài', name_ja = 'カードゲーム' WHERE id = 'a0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f10';
UPDATE public.categories SET name_en = 'Sprites & Characters', name_vi = 'Sprite & nhân vật', name_ja = 'スプライト & キャラクター' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f02';
UPDATE public.categories SET name_en = 'Tilesets & Environments', name_vi = 'Tileset & môi trường', name_ja = 'タイルセット & 環境' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f03';
UPDATE public.categories SET name_en = 'UI Kits & Icons', name_vi = 'UI kit & biểu tượng', name_ja = 'UI キット & アイコン' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f04';
UPDATE public.categories SET name_en = 'Backgrounds & Parallax', name_vi = 'Background & parallax', name_ja = '背景 & パラックス' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f05';
UPDATE public.categories SET name_en = '3D Characters', name_vi = 'Nhân vật 3D', name_ja = '3D キャラクター' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f07';
UPDATE public.categories SET name_en = '3D Props & Objects', name_vi = 'Đạo cụ & vật thể 3D', name_ja = '3D 小物 & オブジェクト' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f08';
UPDATE public.categories SET name_en = '3D Environments & Modular', name_vi = 'Môi trường & modular 3D', name_ja = '3D 環境 & モジュラー' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f09';
UPDATE public.categories SET name_en = '3D Vehicles', name_vi = 'Phương tiện 3D', name_ja = '3D ビークル' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f10';
UPDATE public.categories SET name_en = 'Full Game Templates', name_vi = 'Template game hoàn chỉnh', name_ja = 'フルゲームテンプレート' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f12';
UPDATE public.categories SET name_en = 'Gameplay Systems', name_vi = 'Hệ thống gameplay', name_ja = 'ゲームプレイシステム' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f13';
UPDATE public.categories SET name_en = 'Multiplayer & Network', name_vi = 'Multiplayer & mạng', name_ja = 'マルチプレイヤー & ネットワーク' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f14';
UPDATE public.categories SET name_en = 'Editor Helpers', name_vi = 'Công cụ hỗ trợ editor', name_ja = 'エディタ支援ツール' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f16';
UPDATE public.categories SET name_en = 'Runtime Scripts & Nodes', name_vi = 'Script runtime & node', name_ja = 'ランタイムスクリプト & ノード' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f17';
UPDATE public.categories SET name_en = 'Integration Tools', name_vi = 'Công cụ tích hợp', name_ja = '連携ツール' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f18';
UPDATE public.categories SET name_en = 'PBR Materials', name_vi = 'Material PBR', name_ja = 'PBR マテリアル' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f20';
UPDATE public.categories SET name_en = 'Godot Shaders', name_vi = 'Shader Godot', name_ja = 'Godot シェーダー' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f21';
UPDATE public.categories SET name_en = 'Textures & Patterns', name_vi = 'Texture & pattern', name_ja = 'テクスチャ & パターン' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f22';
UPDATE public.categories SET name_en = 'Sound Effects', name_vi = 'Hiệu ứng âm thanh', name_ja = '効果音' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f24';
UPDATE public.categories SET name_en = 'Music Tracks', name_vi = 'Nhạc nền', name_ja = '音楽トラック' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f25';
UPDATE public.categories SET name_en = 'Ambient & Background Noise', name_vi = 'Âm thanh môi trường', name_ja = '環境音' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f26';
UPDATE public.categories SET name_en = '3D Particle Effects', name_vi = 'Hiệu ứng hạt 3D', name_ja = '3D パーティクル' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f28';
UPDATE public.categories SET name_en = '2D Particle Effects', name_vi = 'Hiệu ứng hạt 2D', name_ja = '2D パーティクル' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f29';
UPDATE public.categories SET name_en = 'Rigged Animations', name_vi = 'Hoạt ảnh rigged', name_ja = 'リグ付きアニメーション' WHERE id = 'e0e1a2a3-b4c5-4d6e-8f9a-0b1c2d3e4f30';

-- 2. Seed Banners translations
UPDATE public.banners SET
  title_en = 'Launch Your Godot Game',
  title_vi = 'Khởi chạy Game Godot của bạn',
  title_ja = 'Godotゲームをローンチしよう',
  description_en = 'Discover original Godot games and production-ready source code from independent creators.',
  description_vi = 'Khám phá các tựa game Godot độc đáo và mã nguồn sẵn sàng phát hành từ các nhà sáng tạo độc lập.',
  description_ja = '個人クリエイターによるオリジナルのGodotゲームや製品品質のソースコードを見つけよう。'
WHERE display_order = 1;

UPDATE public.banners SET
  title_en = 'Build Faster With Premium Assets',
  title_vi = 'Xây dựng nhanh hơn với Tài nguyên Cao cấp',
  title_ja = 'プレミアムアセットで開発をスピードアップ',
  description_en = 'Find polished visual assets, scripts, shaders, and complete systems for your next project.',
  description_vi = 'Tìm kiếm các tài nguyên đồ họa chất lượng, tập lệnh, shader và hệ thống hoàn chỉnh cho dự án tiếp theo của bạn.',
  description_ja = '次のプロジェクトに最適な、洗練されたビジュアルアセット、スクリプト、シェーダー、完成されたシステムを見つけよう。'
WHERE display_order = 2;

UPDATE public.banners SET
  title_en = 'A Marketplace Built For Creators',
  title_vi = 'Chợ tài nguyên dành riêng cho Nhà sáng tạo',
  title_ja = 'クリエイターのために作られたマーケットプレイス',
  description_en = 'Browse verified resources and support the developers building the Godot ecosystem.',
  description_vi = 'Duyệt qua các tài nguyên đã kiểm duyệt và ủng hộ các lập trình viên đang xây dựng hệ sinh thái Godot.',
  description_ja = '検証済みのリソースを閲覧し、Godotエコシステムを構築する開発者を支援しよう。'
WHERE display_order = 3;
