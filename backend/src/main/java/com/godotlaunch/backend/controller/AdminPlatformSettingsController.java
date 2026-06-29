package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.UpdatePlatformSettingsRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.PlatformSettingsResponse;
import com.godotlaunch.backend.service.PlatformSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/platform-settings")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@Tag(name = "Admin Platform Settings API", description = "Admin endpoints for configurable platform variables")
public class AdminPlatformSettingsController {

    private final PlatformSettingsService platformSettingsService;

    @GetMapping
    @Operation(summary = "Get platform settings")
    public ResponseEntity<ApiResponse<PlatformSettingsResponse>> getPlatformSettings() {
        return ResponseEntity.ok(ApiResponse.success(
                platformSettingsService.getPlatformSettings(),
                "Platform settings retrieved successfully"
        ));
    }

    @PutMapping
    @Operation(summary = "Update platform settings")
    public ResponseEntity<ApiResponse<PlatformSettingsResponse>> updatePlatformSettings(
            @Valid @RequestBody UpdatePlatformSettingsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                platformSettingsService.updatePlatformSettings(request),
                "Platform settings updated successfully"
        ));
    }
}
