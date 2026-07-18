package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.service.PlatformSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Endpoint công khai, chỉ lộ commissionRate — dùng cho trang landing
 * "become developer" hiển thị % doanh thu giữ lại (100 - commissionRate)
 * trước khi user đăng nhập/trở thành developer. Tách riêng khỏi
 * AdminPlatformSettingsController (yêu cầu ROLE_ADMIN) để không lộ các
 * setting nhạy cảm khác (maintenanceMode, announcementBanner).
 */
@RestController
@RequestMapping("/api/v1/platform-settings/public")
@RequiredArgsConstructor
@Tag(name = "Public Platform Settings API", description = "Public read-only platform variables")
public class PublicPlatformSettingsController {

    private final PlatformSettingsService platformSettingsService;

    @GetMapping
    @Operation(summary = "Get public commission rate")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> getPublicSettings() {
        BigDecimal commissionRate = platformSettingsService.getPlatformCommissionRate();
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("commissionRate", commissionRate),
                "Public platform settings retrieved successfully"
        ));
    }
}
