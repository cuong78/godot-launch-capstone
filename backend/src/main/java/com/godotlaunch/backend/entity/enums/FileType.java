package com.godotlaunch.backend.entity.enums;

public enum FileType {
    avatar,          // ảnh đại diện user
    pdf_contract,    // file hợp đồng PDF
    game_media,      // thumbnail + screenshot + video CỦA GAME
    asset_media,     // ảnh resource của marketplace asset
    source_bundle,   // source code đã bundle zip (game + marketplace source_code)
    web_demo,        // Godot export "Web" (.html/.js/.wasm/.pck) — Live Preview chơi thử trước khi mua
    payment_receipt,  // ảnh/biên lai chuyển khoản người mua upload
    cccd_image       // ảnh xác thực CCCD/Passport
}

