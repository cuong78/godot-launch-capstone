package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CreateMarketplaceItemRequest;
import com.godotlaunch.backend.dto.request.UpdateMarketplaceItemRequest;
import com.godotlaunch.backend.dto.response.MarketplaceItemResponse;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface MarketplaceItemService {
    UUID createMarketplaceItem(CreateMarketplaceItemRequest request, String sellerEmail);
    MarketplaceItemResponse getMarketplaceItemById(UUID id);
    List<MarketplaceItemResponse> getAllMarketplaceItems();
    List<MarketplaceItemResponse> getMarketplaceItemsByStatus(ItemStatus status);
    List<MarketplaceItemResponse> getMarketplaceItemsBySeller(String sellerEmail);
    MarketplaceItemResponse updateMarketplaceItem(UUID id, UpdateMarketplaceItemRequest request, String updaterEmail);
    String getPresignedUploadUrl(UUID itemId, String contentType);
    void confirmUploadComplete(UUID itemId, String objectKey);

    /**
     * Proxy upload zip qua backend → StorageRouter (tôn trọng routing config S3/SeaweedFS).
     * Dùng thay cho presigned URL vì SeaweedFS không hỗ trợ presigned.
     */
    void uploadItemFile(UUID itemId, MultipartFile file, String uploaderEmail);
    void approveMarketplaceItem(UUID id);
    void rejectMarketplaceItem(UUID id, String reason);
    void removeMarketplaceItem(UUID id, String updaterEmail);

    /**
     * Proxy upload media (thumbnail, screenshot, video) cho MarketplaceItem.
     */
    String uploadMarketplaceItemMedia(UUID id, String fileType, MultipartFile file, String uploaderEmail);

    /**
     * Xóa 1 file media cụ thể của MarketplaceItem theo URL.
     */
    void deleteMarketplaceItemMediaByUrl(UUID id, String mediaUrl, String uploaderEmail);
}
