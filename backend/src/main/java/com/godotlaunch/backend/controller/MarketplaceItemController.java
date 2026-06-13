package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateMarketplaceItemRequest;
import com.godotlaunch.backend.dto.request.UpdateMarketplaceItemRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.MarketplaceItemResponse;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.service.MarketplaceItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/marketplace-items")
@RequiredArgsConstructor
@Tag(name = "Creator Marketplace API", description = "Endpoints for listing, uploading, and managing assets & source codes")
public class MarketplaceItemController {

    private final MarketplaceItemService marketplaceItemService;

    @PostMapping
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Create marketplace item", description = "Initializes a marketplace item. Bypasses GitHub verification automatically for now.")
    public ResponseEntity<ApiResponse<Map<String, UUID>>> createMarketplaceItem(
            @Valid @RequestBody CreateMarketplaceItemRequest request,
            Principal principal) {
        String sellerEmail = principal.getName();
        UUID itemId = marketplaceItemService.createMarketplaceItem(request, sellerEmail);
        return ResponseEntity.ok(ApiResponse.success(Map.of("itemId", itemId), "Marketplace item initialized successfully"));
    }

    @GetMapping
    @Operation(summary = "Get all marketplace items", description = "Retrieves active or removed marketplace items (optionally filtered by status).")
    public ResponseEntity<ApiResponse<List<MarketplaceItemResponse>>> getAllMarketplaceItems(
            @RequestParam(required = false) ItemStatus status) {
        List<MarketplaceItemResponse> items;
        if (status != null) {
            items = marketplaceItemService.getMarketplaceItemsByStatus(status);
        } else {
            items = marketplaceItemService.getAllMarketplaceItems();
        }
        return ResponseEntity.ok(ApiResponse.success(items, "Marketplace items retrieved successfully"));
    }

    @GetMapping("/my-items")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Get current seller items", description = "Retrieves all marketplace items listed by the authenticated developer.")
    public ResponseEntity<ApiResponse<List<MarketplaceItemResponse>>> getMyMarketplaceItems(Principal principal) {
        String sellerEmail = principal.getName();
        List<MarketplaceItemResponse> items = marketplaceItemService.getMarketplaceItemsBySeller(sellerEmail);
        return ResponseEntity.ok(ApiResponse.success(items, "Your marketplace items retrieved successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get marketplace item by ID", description = "Retrieves details of a specific marketplace asset or project template.")
    public ResponseEntity<ApiResponse<MarketplaceItemResponse>> getMarketplaceItemById(@PathVariable UUID id) {
        MarketplaceItemResponse item = marketplaceItemService.getMarketplaceItemById(id);
        return ResponseEntity.ok(ApiResponse.success(item, "Marketplace item retrieved successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Update marketplace item", description = "Updates metadata parameters for a marketplace listing.")
    public ResponseEntity<ApiResponse<MarketplaceItemResponse>> updateMarketplaceItem(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateMarketplaceItemRequest request,
            Principal principal) {
        String updaterEmail = principal.getName();
        MarketplaceItemResponse updatedItem = marketplaceItemService.updateMarketplaceItem(id, request, updaterEmail);
        return ResponseEntity.ok(ApiResponse.success(updatedItem, "Marketplace item updated successfully"));
    }

    @GetMapping("/{id}/upload-url")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Request S3 presigned upload URL", description = "Generates a secure S3 PUT upload link for file upload (project.zip).")
    public ResponseEntity<ApiResponse<Map<String, String>>> getUploadUrl(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "application/zip") String contentType) {
        String url = marketplaceItemService.getPresignedUploadUrl(id, contentType);
        return ResponseEntity.ok(ApiResponse.success(Map.of("uploadUrl", url), "Presigned URL generated successfully"));
    }

    @PostMapping("/{id}/upload-complete")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Confirm upload complete", description = "Signals that the file has been successfully uploaded to S3. Updates database URL.")
    public ResponseEntity<ApiResponse<Map<String, String>>> confirmUploadComplete(
            @PathVariable UUID id,
            @RequestParam(required = false) String objectKey) {
        marketplaceItemService.confirmUploadComplete(id, objectKey);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Marketplace item ZIP uploaded successfully"), "Success"));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Approve marketplace item", description = "Approves a pending marketplace item, changing its status to active and notifying the developer.")
    public ResponseEntity<ApiResponse<Void>> approveMarketplaceItem(@PathVariable UUID id) {
        marketplaceItemService.approveMarketplaceItem(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Marketplace item approved successfully"));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Reject marketplace item", description = "Rejects a pending marketplace item, changing its status to rejected, deleting files and notifying the developer.")
    public ResponseEntity<ApiResponse<Void>> rejectMarketplaceItem(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> requestBody) {
        String reason = requestBody != null ? requestBody.getOrDefault("reason", "Violated store policies") : "Violated store policies";
        marketplaceItemService.rejectMarketplaceItem(id, reason);
        return ResponseEntity.ok(ApiResponse.success(null, "Marketplace item rejected successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Remove marketplace item", description = "Soft-deletes a marketplace item listing (sets status to removed).")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteMarketplaceItem(
            @PathVariable UUID id,
            Principal principal) {
        String updaterEmail = principal.getName();
        marketplaceItemService.removeMarketplaceItem(id, updaterEmail);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Marketplace item removed successfully"), "Success"));
    }
}
