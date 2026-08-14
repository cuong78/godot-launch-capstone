package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.CreateAssetRequest;
import com.godotlaunch.backend.dto.request.UpdateAssetRequest;
import com.godotlaunch.backend.dto.response.AssetResponse;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface AssetService {
    UUID createAsset(CreateAssetRequest request, String sellerEmail);
    AssetResponse getAssetById(UUID id, String requesterEmail);
    List<AssetResponse> getAllAssets(String requesterEmail);
    List<AssetResponse> getAllAssets(ItemStatus status, String search, String requesterEmail);
    List<AssetResponse> getAssetsByStatus(ItemStatus status, String requesterEmail);
    List<AssetResponse> getAssetsBySeller(String sellerEmail);
    AssetResponse updateAsset(UUID id, UpdateAssetRequest request, String updaterEmail);
    String getPresignedUploadUrl(UUID itemId, String contentType, String requesterEmail);
    void confirmUploadComplete(UUID itemId, String objectKey, String requesterEmail);

    /**
     * Proxy upload zip qua backend → SeaweedFsService.
     * Dùng thay cho presigned URL.
     */
    void uploadItemFile(UUID itemId, MultipartFile file, String uploaderEmail);

    /**
     * Upload media cho asset qua SeaweedFsService.
     * @param mediaType 'thumbnail' | 'screenshot' | 'video' | 'asset_image'
     * @return objectKey để frontend track / xóa lẻ
     */
    String uploadItemMedia(UUID itemId, String mediaType, MultipartFile file, String uploaderEmail);

    /** Xóa 1 media theo mediaUrl. */
    void deleteAssetMedia(UUID itemId, String mediaUrl, String uploaderEmail);

    void approveAsset(UUID id);
    void rejectAsset(UUID id, String reason);
    void removeAsset(UUID id, String updaterEmail);

    /**
     * Proxy upload media (thumbnail, screenshot, video) cho Asset.
     */
    String uploadAssetMediaProxy(UUID id, String fileType, MultipartFile file, String uploaderEmail);

    /**
     * Xóa 1 file media cụ thể của Asset theo URL.
     */
    void deleteAssetMediaByUrl(UUID id, String mediaUrl, String uploaderEmail);

    /**
     * Nhận file zip gộp và khởi chạy tác vụ xử lý chạy nền bất đồng bộ.
     */
    void startUnifiedAssetUpload(UUID itemId, MultipartFile file, String uploaderEmail);

    /**
     * Lấy trạng thái xử lý upload hiện tại của Asset.
     */
    AssetResponse getUploadStatus(UUID itemId, String requesterEmail);

    /**
     * Sắp xếp lại thứ tự hình ảnh chụp màn hình (screenshots) của Asset.
     */
    void reorderScreenshots(UUID itemId, java.util.List<String> orderedUrls, String requesterEmail);
}
