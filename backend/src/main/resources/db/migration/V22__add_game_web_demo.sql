-- Live Preview: buyer chơi thử bản Web build (Godot export "Web") ngay trên
-- trình duyệt trước khi mua source — không lộ source (WebAssembly compiled).
ALTER TABLE public.games
    ADD COLUMN web_demo_url text;
