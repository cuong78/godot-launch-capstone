package com.godotlaunch.backend.entity.enums;

/**
 * Loại vector lưu trong Embedding — quyết định dùng cột vector128 hay
 * vector512 (xem Embedding.java).
 */
public enum EmbeddingType {
    face,       // khuôn mặt user (dlib/face_recognition, 128-dim) — chống 2 tài khoản dùng chung 1 mặt
    kyc_front,  // ảnh CCCD/Passport mặt trước (CLIP, 512-dim) — chống re-upload ảnh cũ + sửa idNumber
    kyc_back    // ảnh CCCD mặt sau (CLIP, 512-dim)
}
