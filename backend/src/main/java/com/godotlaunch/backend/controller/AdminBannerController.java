package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateBannerRequest;
import com.godotlaunch.backend.dto.request.UpdateBannerRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.BannerResponse;
import com.godotlaunch.backend.service.BannerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/banners")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@Tag(name = "Admin Banner API", description = "Banner management endpoints")
public class AdminBannerController {

    private final BannerService bannerService;

    @GetMapping
    @Operation(summary = "Get all banners")
    public ResponseEntity<ApiResponse<List<BannerResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getAll(), "Banners retrieved successfully"));
    }

    @PostMapping
    @Operation(summary = "Create banner")
    public ResponseEntity<ApiResponse<BannerResponse>> create(@Valid @RequestBody CreateBannerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.create(request), "Banner created successfully"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update banner")
    public ResponseEntity<ApiResponse<BannerResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBannerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.update(id, request), "Banner updated successfully"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete banner")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        bannerService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Banner deleted successfully"));
    }

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload banner image")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(@RequestParam("file") MultipartFile file) {
        String imageUrl = bannerService.uploadImage(file);
        return ResponseEntity.ok(ApiResponse.success(Map.of("imageUrl", imageUrl), "Banner image uploaded successfully"));
    }
}
