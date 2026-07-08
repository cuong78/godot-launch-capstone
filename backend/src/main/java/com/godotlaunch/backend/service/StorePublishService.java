package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.response.ExternalPublishResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface StorePublishService {
    /**
     * Admin upload build APK/AAB (export thủ công từ Godot Editor) cho 1 game đã ký hợp đồng
     * (status = awaiting_store_build) → tạo GameVersion mới → tự động submit lên Google Play.
     * shortDescription + featureGraphic là asset bắt buộc riêng cho store listing (Google Play yêu cầu,
     * khác với thumbnail/screenshots trang GodotLaunch) — icon và screenshots được tái dùng từ Game/Media có sẵn.
     */
    ExternalPublishResponse uploadBuildAndPublish(UUID gameId, MultipartFile file, String versionNumber,
                                                   String changelog, String shortDescription,
                                                   MultipartFile featureGraphic, UUID adminId);

    /** Trạng thái submit Google Play mới nhất của game (null nếu chưa từng upload build). */
    ExternalPublishResponse getLatestForGame(UUID gameId);
}
