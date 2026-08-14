package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateAssetRequest;
import com.godotlaunch.backend.dto.request.UpdateAssetRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.AssetResponse;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.service.AssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
@Tag(name = "Creator Marketplace API", description = "Endpoints for listing, uploading, and managing assets & source codes")
public class AssetController {

    private final AssetService assetService;

    @GetMapping("/template")
    @Operation(summary = "Tải file template upload mẫu cho Asset", description = "Trả về file template zip cấu trúc thư mục gộp.")
    public ResponseEntity<org.springframework.core.io.Resource> downloadTemplate() {
        org.springframework.core.io.Resource resource = new org.springframework.core.io.ClassPathResource("static/templates/asset_template.zip");
        if (!resource.exists()) {
            throw new com.godotlaunch.backend.exception.AppException(com.godotlaunch.backend.constant.ErrorCode.FILE_NOT_FOUND, "Không tìm thấy file template mẫu trên server.");
        }
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"asset_template.zip\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @PostMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Create marketplace item", description = "Initializes a marketplace item. Bypasses GitHub verification automatically for now.")
    public ResponseEntity<ApiResponse<Map<String, UUID>>> createAsset(
            @Valid @RequestBody CreateAssetRequest request,
            Principal principal) {
        String sellerEmail = principal.getName();
        UUID itemId = assetService.createAsset(request, sellerEmail);
        return ResponseEntity.ok(ApiResponse.success(Map.of("itemId", itemId), "Marketplace item initialized successfully"));
    }

    @GetMapping
    @Operation(summary = "Get all marketplace items", description = "Retrieves active or removed marketplace items (optionally filtered by status or search keyword).")
    public ResponseEntity<ApiResponse<List<AssetResponse>>> getAllAssets(
            @RequestParam(required = false) ItemStatus status,
            @RequestParam(required = false) String search,
            Principal principal) {
        List<AssetResponse> items = assetService.getAllAssets(status, search, principal != null ? principal.getName() : null);
        return ResponseEntity.ok(ApiResponse.success(items, "Marketplace items retrieved successfully"));
    }

    @GetMapping("/my-items")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Get current seller items", description = "Retrieves all marketplace items listed by the authenticated developer.")
    public ResponseEntity<ApiResponse<List<AssetResponse>>> getMyAssets(Principal principal) {
        String sellerEmail = principal.getName();
        List<AssetResponse> items = assetService.getAssetsBySeller(sellerEmail);
        return ResponseEntity.ok(ApiResponse.success(items, "Your marketplace items retrieved successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get marketplace item by ID", description = "Retrieves details of a specific marketplace asset or project template.")
    public ResponseEntity<ApiResponse<AssetResponse>> getAssetById(@PathVariable UUID id, Principal principal) {
        AssetResponse item = assetService.getAssetById(id, principal != null ? principal.getName() : null);
        return ResponseEntity.ok(ApiResponse.success(item, "Marketplace item retrieved successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Update marketplace item", description = "Updates metadata parameters for a marketplace listing.")
    public ResponseEntity<ApiResponse<AssetResponse>> updateAsset(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAssetRequest request,
            Principal principal) {
        String updaterEmail = principal.getName();
        AssetResponse updatedItem = assetService.updateAsset(id, request, updaterEmail);
        return ResponseEntity.ok(ApiResponse.success(updatedItem, "Marketplace item updated successfully"));
    }

    @GetMapping("/{id}/upload-url")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Request SeaweedFS upload URL", description = "Generates a SeaweedFS upload link for file upload (project.zip).")
    public ResponseEntity<ApiResponse<Map<String, String>>> getUploadUrl(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "application/zip") String contentType,
            Principal principal) {
        String url = assetService.getPresignedUploadUrl(id, contentType, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("uploadUrl", url), "Presigned URL generated successfully"));
    }

    @PostMapping(value = "/{id}/upload", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Upload item ZIP qua proxy", description = "Upload file (ASSET) qua backend → SeaweedFsService. Source_code dùng submit-repo thay vì upload.")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadItemFile(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            Principal principal) {
        assetService.uploadItemFile(id, file, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "File uploaded successfully"), "Success"));
    }

    @PostMapping(value = "/{id}/upload-unified", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Upload unified asset ZIP", description = "Upload file ZIP gộp (chứa thumbnail, screenshots, video, assets). Xử lý bất đồng bộ trong nền.")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadUnifiedAsset(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            Principal principal) {
        assetService.startUnifiedAssetUpload(id, file, principal.getName());
        return ResponseEntity.status(org.springframework.http.HttpStatus.ACCEPTED)
                .body(ApiResponse.success(Map.of("assetId", id.toString(), "status", "PROCESSING"), "File upload received and is being processed in background."));
    }

    @GetMapping("/{id}/upload-status")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Lấy trạng thái xử lý upload gộp", description = "Trả về trạng thái xử lý zip gộp hiện tại (PROCESSING, SUCCESS, FAILED).")
    public ResponseEntity<ApiResponse<AssetResponse>> getUploadStatus(
            @PathVariable UUID id,
            Principal principal) {
        AssetResponse response = assetService.getUploadStatus(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Upload status retrieved successfully."));
    }

    @PutMapping("/{id}/reorder-screenshots")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Sắp xếp thứ tự ảnh screenshots", description = "Nhận danh sách URL screenshots đã sắp xếp và cập nhật trong DB.")
    public ResponseEntity<ApiResponse<Map<String, String>>> reorderScreenshots(
            @PathVariable UUID id,
            @RequestBody java.util.List<String> orderedUrls,
            Principal principal) {
        assetService.reorderScreenshots(id, orderedUrls, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Screenshots reordered successfully"), "Success"));
    }

    @PostMapping(value = "/{id}/media", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Upload media cho item", description = "mediaType: thumbnail | screenshot | video | asset_image. Upload qua SeaweedFsService.")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadItemMedia(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "asset_image") String mediaType,
            Principal principal) {
        String objectKey = assetService.uploadItemMedia(id, mediaType, file, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("message", "Media uploaded", "objectKey", objectKey), "Success"));
    }

    @DeleteMapping("/{id}/media")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Xóa 1 ảnh preview của asset")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteAssetMedia(
            @PathVariable UUID id,
            @RequestParam String mediaUrl,
            Principal principal) {
        assetService.deleteAssetMedia(id, mediaUrl, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Media deleted"), "Success"));
    }


    @PostMapping("/{id}/upload-complete")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Confirm upload complete", description = "Signals that the file has been successfully uploaded to storage. Updates database URL.")
    public ResponseEntity<ApiResponse<Map<String, String>>> confirmUploadComplete(
            @PathVariable UUID id,
            @RequestParam(required = false) String objectKey,
            Principal principal) {
        assetService.confirmUploadComplete(id, objectKey, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Marketplace item ZIP uploaded successfully"), "Success"));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Approve marketplace item", description = "Approves a pending marketplace item, changing its status to active and notifying the developer.")
    public ResponseEntity<ApiResponse<Void>> approveAsset(@PathVariable UUID id) {
        assetService.approveAsset(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Marketplace item approved successfully"));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Reject marketplace item", description = "Rejects a pending marketplace item, changing its status to rejected, deleting files and notifying the developer.")
    public ResponseEntity<ApiResponse<Void>> rejectAsset(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> requestBody) {
        String reason = requestBody != null ? requestBody.getOrDefault("reason", "Violated store policies") : "Violated store policies";
        assetService.rejectAsset(id, reason);
        return ResponseEntity.ok(ApiResponse.success(null, "Marketplace item rejected successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Remove marketplace item", description = "Soft-deletes a marketplace item listing (sets status to removed).")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteAsset(
            @PathVariable UUID id,
            Principal principal) {
        String updaterEmail = principal.getName();
        assetService.removeAsset(id, updaterEmail);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Marketplace item removed successfully"), "Success"));
    }

    @PostMapping(value = "/{id}/media/upload", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Upload media qua proxy", description = "Upload thumbnail/screenshot/video của marketplace item qua backend → StorageRouter.")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadMarketplaceMedia(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "screenshot") String fileType,
            Principal principal) {
        String objectKey = assetService.uploadAssetMediaProxy(id, fileType, file, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("message", "Media uploaded successfully", "objectKey", objectKey), "Success"));
    }

    @DeleteMapping("/{id}/media/item")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Operation(summary = "Xóa 1 media cụ thể", description = "Xóa 1 screenshot/video của marketplace item theo mediaUrl.")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteMarketplaceMediaItem(
            @PathVariable UUID id,
            @RequestParam String mediaUrl,
            Principal principal) {
        assetService.deleteAssetMediaByUrl(id, mediaUrl, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Media item deleted successfully"), "Success"));
    }
}
