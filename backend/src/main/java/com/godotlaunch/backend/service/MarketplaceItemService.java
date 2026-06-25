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

    /**
     * Submit marketplace source_code bằng repo GitHub: verify owner → clone → scan → snapshot.
     * Như game. Sạch → pending (chờ admin), nhiễm → removed. Private chưa cấp quyền → REPO_NEEDS_BOT.
     */
    void submitItemRepo(UUID itemId, String repoUrl, String branch, String sellerEmail);

    /** Bot accept invitation cho repo private của marketplace item. */
    boolean acceptBotInvitation(String repoUrl, String sellerEmail);

    /**
     * Upload media cho marketplace item qua StorageRouter.
     * @param mediaType 'thumbnail' | 'screenshot' | 'video' | 'asset_image'
     * @return objectKey để frontend track / xóa lẻ
     */
    String uploadItemMedia(UUID itemId, String mediaType, MultipartFile file, String uploaderEmail);

    /** Xóa 1 media theo mediaUrl. */
    void deleteAssetMedia(UUID itemId, String mediaUrl, String uploaderEmail);

    /**
     * Lấy URL source bundle để tải. Chỉ admin / người đã mua item / seller được phép.
     * @return bundle URL, throw ACCESS_DENIED nếu không có quyền.
     */
    String getSourceBundleUrl(UUID itemId, String requesterEmail);

    void approveMarketplaceItem(UUID id);
    void rejectMarketplaceItem(UUID id, String reason);
    void removeMarketplaceItem(UUID id, String updaterEmail);
}
