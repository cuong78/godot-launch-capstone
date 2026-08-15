package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateAssetRequest;
import com.godotlaunch.backend.dto.request.UpdateAssetRequest;
import com.godotlaunch.backend.dto.response.AssetResponse;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.CategoryRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AsyncVirusScanService;
import com.godotlaunch.backend.service.SeaweedFsService;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.NotificationService;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.service.AssetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.service.AuditLogService;

import java.io.InputStream;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssetServiceImpl implements AssetService {

    private static final long MAX_IMAGE_SIZE_BYTES = 10L * 1024 * 1024; // 10MB cho thumbnail/screenshot
    private static final long MAX_VIDEO_SIZE_BYTES = 50L * 1024 * 1024; // 50MB cho video demo

    private final AssetRepository assetRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final GameRepository gameRepository;
    private final com.godotlaunch.backend.repository.TagRepository tagRepository;
    private final SeaweedFsService seaweedFsService;
    private final AsyncVirusScanService asyncVirusScanService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final com.godotlaunch.backend.service.GitHubRepoService gitHubRepoService;
    private final com.godotlaunch.backend.config.SourceProcessingClient sourceProcessingClient;
    private final com.godotlaunch.backend.repository.SourceSnapshotRepository sourceSnapshotRepository;
    private final com.godotlaunch.backend.repository.MediaRepository mediaRepository;
    private final com.godotlaunch.backend.repository.OrderRepository orderRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final com.godotlaunch.backend.service.AiReviewService aiReviewService;
    private final AuditLogService auditLogService;
    private final UnifiedAssetUploadHelper unifiedAssetUploadHelper;

    /** ObjectKey cố định cho zip của 1 marketplace item. */
    private String buildObjectKey(UUID itemId) {
        return "marketplace/items/" + itemId + "/project.zip";
    }

    private User getRequesterWithRole(String requesterEmail) {
        return userRepository.findWithRoleByEmail(requesterEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private void assertDeveloper(User user) {
        String roleName = user.getRole() != null ? user.getRole().getName() : null;
        if (!"developer".equalsIgnoreCase(roleName)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    private void assertAssetOwner(Asset item, User requester) {
        if (!item.getSeller().getId().equals(requester.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }


    @Override
    @Transactional
    public UUID createAsset(CreateAssetRequest request, String sellerEmail) {
        User seller = getRequesterWithRole(sellerEmail);
        assertDeveloper(seller);

        if (!seller.isFaceVerified()) {
            throw new AppException(ErrorCode.FACE_VERIFY_REQUIRED);
        }

        Asset item = new Asset();
        item.setSeller(seller);
        item.setTitle(request.getTitle());
        item.setDescription(request.getDescription());
        item.setPrice(request.getPrice());
        item.setStatus(ItemStatus.pending);
        item.setVersion(request.getVersion() != null && !request.getVersion().isBlank() ? request.getVersion() : "1.0.0");

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
            item.setCategory(category);
        }

        // fileUrl is NOT NULL in database, default to placeholder if not provided
        if (request.getFileUrl() != null && !request.getFileUrl().trim().isEmpty()) {
            item.setFileUrl(request.getFileUrl());
        } else {
            item.setFileUrl("pending");
        }

        // Tags (nhiều-nhiều)
        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            item.setTags(new java.util.HashSet<>(tagRepository.findByIdIn(request.getTagIds())));
        }



        Asset savedItem = assetRepository.save(item);
        return savedItem.getId();
    }

    @Override
    @Transactional(readOnly = true)
    public AssetResponse getAssetById(UUID id, String requesterEmail) {
        Asset item = assetRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        return mapToResponse(item, canAccessPrivateItemFields(item, resolveRequester(requesterEmail).orElse(null)));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssetResponse> getAllAssets(String requesterEmail) {
        return getAllAssets(null, null, requesterEmail);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssetResponse> getAllAssets(ItemStatus status, String search, String requesterEmail) {
        User requester = resolveRequester(requesterEmail).orElse(null);
        if (search != null && !search.isBlank()) {
            return assetRepository.searchAssets(status, search.trim()).stream()
                    .map(item -> mapToResponse(item, canAccessPrivateItemFields(item, requester)))
                    .collect(Collectors.toList());
        }
        if (status != null) {
            return getAssetsByStatus(status, requesterEmail);
        }
        return assetRepository.findAll().stream()
                .map(item -> mapToResponse(item, canAccessPrivateItemFields(item, requester)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssetResponse> getAssetsByStatus(ItemStatus status, String requesterEmail) {
        User requester = resolveRequester(requesterEmail).orElse(null);
        return assetRepository.findByStatus(status).stream()
                .map(item -> mapToResponse(item, canAccessPrivateItemFields(item, requester)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssetResponse> getAssetsBySeller(String sellerEmail) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return assetRepository.findBySellerId(seller.getId()).stream()
                .map(item -> mapToResponse(item, true))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AssetResponse updateAsset(UUID id, UpdateAssetRequest request, String updaterEmail) {
        User updater = getRequesterWithRole(updaterEmail);
        assertDeveloper(updater);
        Asset item = assetRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        assertAssetOwner(item, updater);

        if (request.getPrice() != null && item.getPrice() != null
                && request.getPrice().compareTo(item.getPrice()) != 0) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Không thể thay đổi giá bán khi cập nhật sản phẩm.");
        }
        if (request.getCategoryId() != null && (item.getCategory() == null || !request.getCategoryId().equals(item.getCategory().getId()))) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Không thể thay đổi danh mục khi cập nhật sản phẩm.");
        }

        if (request.getTitle() != null) {
            item.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            item.setDescription(request.getDescription());
        }
        if (request.getFileUrl() != null) {
            item.setFileUrl(request.getFileUrl());
        }
        if (request.getVersion() != null) {
            item.setVersion(request.getVersion());
        }



        // Set status back to pending upon update so it goes back to admin moderation queue
        item.setStatus(ItemStatus.pending);

        Asset updatedItem = assetRepository.save(item);
        return mapToResponse(updatedItem, true);
    }

    @Override
    @Transactional(readOnly = true)
    public String getPresignedUploadUrl(UUID itemId, String contentType, String requesterEmail) {
        User requester = getRequesterWithRole(requesterEmail);
        assertDeveloper(requester);
        Asset item = assetRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        assertAssetOwner(item, requester);

        String objectKey = buildObjectKey(item.getId());
        return seaweedFsService.generatePresignedUploadUrl(objectKey, contentType);
    }

    @Override
    @Transactional
    public void uploadItemFile(UUID itemId, MultipartFile file, String uploaderEmail) {
        User uploader = getRequesterWithRole(uploaderEmail);
        assertDeveloper(uploader);
        Asset item = assetRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        assertAssetOwner(item, uploader);

        // Calculate hash of the new file
        String newHash = null;
        try (InputStream is = file.getInputStream()) {
            newHash = calculateSha256(is);
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể đọc tệp để tính toán checksum: " + e.getMessage());
        }

        if (newHash == null) {
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể tính toán mã hash SHA-256 cho tệp tài nguyên tải lên.");
        }

        log.info("Asset update upload {}: Calculated hash = {}, Current hash = {}", itemId, newHash, item.getZipHash());

        if (newHash.equals(item.getZipHash())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Nội dung tệp tài nguyên tải lên trùng khớp hoàn toàn với phiên bản hiện tại. Vui lòng thực hiện cập nhật nội dung trước khi tải lên.");
        }

        String objectKey = buildObjectKey(item.getId());
        // Upload qua SeaweedFsService
        String fileUrl = seaweedFsService.uploadWithKey(file, objectKey);
        item.setFileUrl(fileUrl);
        item.setZipHash(newHash);
        item.setVersion(incrementVersion(item.getVersion())); // Auto-increment version
        item.setStatus(ItemStatus.pending); // Reset status to pending for admin moderation!
        assetRepository.save(item);

        asyncVirusScanService.scanAndProcessAsset(itemId, objectKey);
        log.info("Marketplace item {} uploaded via SeaweedFsService with key {}, virus scan started",
                itemId, objectKey);

        // Asset (upload file, không repo): AI review media-only (CLIP + NSFW). Fail-soft.
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    aiReviewService.reviewAssetAsync(itemId);
                }
            });
        } else {
            aiReviewService.reviewAssetAsync(itemId);
        }
    }

    @Override
    @Transactional
    public String uploadItemMedia(UUID itemId, String mediaType, MultipartFile file, String uploaderEmail) {
        User uploader = getRequesterWithRole(uploaderEmail);
        assertDeveloper(uploader);
        Asset item = assetRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        assertAssetOwner(item, uploader);

        // Chuẩn hóa media_type: thumbnail | screenshot | video | asset_image
        String type = switch (mediaType == null ? "" : mediaType.toLowerCase()) {
            case "thumbnail" -> "thumbnail";
            case "video"     -> "video";
            case "screenshot", "image" -> "screenshot";
            default -> "asset_image";
        };

        // Chặn ảnh/video gốc quá nặng (VD: ảnh chụp trực tiếp từ điện thoại) làm chậm tải trang cho người xem.
        long maxSize = "video".equals(type) ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
        if (file != null && file.getSize() > maxSize) {
            throw new AppException(ErrorCode.MEDIA_FILE_TOO_LARGE);
        }

        // thumbnail & video chỉ 1 cái/item → thay thế cái cũ
        if ("thumbnail".equals(type) || "video".equals(type)) {
            deleteItemMediaByType(itemId, type);
        }

        String ext = "";
        if (file != null && file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")) {
            ext = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf("."));
        }
        String objectKey = "marketplace/items/" + itemId + "/media/" + UUID.randomUUID() + ext;
        String mediaUrl = seaweedFsService.uploadWithKey(file, objectKey);

        com.godotlaunch.backend.entity.Media media = new com.godotlaunch.backend.entity.Media();
        media.setAsset(item);
        media.setMediaType(type);
        media.setMediaUrl(mediaUrl);
        mediaRepository.save(media);

        if ("thumbnail".equals(type)) {
            item.setThumbnailUrl(mediaUrl);
            assetRepository.save(item);
        }

        return objectKey;
    }

    @Override
    @Transactional
    public void deleteAssetMedia(UUID itemId, String mediaUrl, String uploaderEmail) {
        User uploader = getRequesterWithRole(uploaderEmail);
        assertDeveloper(uploader);
        Asset item = assetRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        assertAssetOwner(item, uploader);

        String targetKey = extractObjectKeyFromUrl(mediaUrl);
        mediaRepository.findByAsset_IdOrderByCreatedAtDesc(itemId).stream()
                .filter(m -> targetKey != null && targetKey.equals(extractObjectKeyFromUrl(m.getMediaUrl())))
                .findFirst()
                .ifPresent(m -> {
                    mediaRepository.delete(m);
                    try {
                        seaweedFsService.deleteObject(targetKey);
                    } catch (Exception e) {
                        log.warn("Đã xóa record asset media nhưng không xóa được file: {}", targetKey, e);
                    }
                });
    }

    @Override
    @Transactional
    public String uploadAssetMediaProxy(UUID id, String fileType, MultipartFile file, String uploaderEmail) {
        return uploadItemMedia(id, fileType, file, uploaderEmail);
    }

    @Override
    @Transactional
    public void deleteAssetMediaByUrl(UUID id, String mediaUrl, String uploaderEmail) {
        deleteAssetMedia(id, mediaUrl, uploaderEmail);
    }

    /** Xóa toàn bộ media 1 loại của item (dùng khi thay thumbnail/video). */
    private void deleteItemMediaByType(UUID itemId, String mediaType) {
        mediaRepository.findByAsset_IdAndMediaType(itemId, mediaType)
                .forEach(m -> {
                    String key = extractObjectKeyFromUrl(m.getMediaUrl());
                    if (key != null) {
                        try { seaweedFsService.deleteObject(key); } catch (Exception ignored) {}
                    }
                    mediaRepository.delete(m);
                });
    }

    @Override
    @Transactional
    public void confirmUploadComplete(UUID itemId, String objectKey, String requesterEmail) {
        User requester = getRequesterWithRole(requesterEmail);
        assertDeveloper(requester);
        Asset item = assetRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        assertAssetOwner(item, requester);

        String actualKey = objectKey != null ? objectKey : buildObjectKey(item.getId());
        String fileUrl = seaweedFsService.getFileUrl(actualKey);
        item.setFileUrl(fileUrl);
        assetRepository.save(item);

        asyncVirusScanService.scanAndProcessAsset(itemId, actualKey);
        log.info("Marketplace item {} upload confirmed with key {} and virus scan started", itemId, actualKey);
    }

    @Override
    @Transactional
    public void approveAsset(UUID id) {
        Asset item = assetRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        if (item.getStatus() != ItemStatus.pending) {
            throw new IllegalStateException("Marketplace item must be in pending status to be approved");
        }

        item.setStatus(ItemStatus.active);
        assetRepository.save(item);

        emailService.sendAssetStatusNotification(
                item.getSeller().getEmail(),
                item.getTitle(),
                "APPROVED",
                "Your marketplace asset has been approved by the admin and is now active on the marketplace."
        );
        log.info("Marketplace item {} approved and email sent to {}", id, item.getSeller().getEmail());

        auditLogService.publishAuto(
                AuditAction.game_published,
                AuditTarget.marketplace_item,
                id,
                ItemStatus.pending.name(),
                ItemStatus.active.name(),
                "Marketplace item '" + item.getTitle() + "' approved and activated by administrator."
        );

        notificationService.createAndSendNotification(
                item.getSeller(),
                null,
                NotificationType.GAME_REVIEW_RESULT,
                "Sản phẩm asset \"" + item.getTitle() + "\" của bạn đã được quản trị viên phê duyệt thành công!",
                item.getId().toString()
        );
    }

    @Override
    @Transactional
    public void rejectAsset(UUID id, String reason) {
        Asset item = assetRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        if (item.getStatus() != ItemStatus.pending) {
            throw new IllegalStateException("Marketplace item must be in pending status to be rejected");
        }

        item.setStatus(ItemStatus.rejected);
        assetRepository.save(item);

        // Delete storage zip file
        try {
            String objectKey = "marketplace/items/" + item.getId().toString() + "/project.zip";
            seaweedFsService.deleteObject(objectKey);
            log.info("Deleted storage file for rejected marketplace item: {}", id);
        } catch (Exception e) {
            log.warn("Failed to delete storage file for item: {}. Error: {}", id, e.getMessage());
        }

        emailService.sendAssetStatusNotification(
                item.getSeller().getEmail(),
                item.getTitle(),
                "REJECTED",
                reason != null ? reason : "Violated store policies"
        );
        log.info("Marketplace item {} rejected and email sent to {}", id, item.getSeller().getEmail());

        auditLogService.publishAuto(
                AuditAction.game_rejected,
                AuditTarget.marketplace_item,
                id,
                ItemStatus.pending.name(),
                ItemStatus.rejected.name(),
                "Marketplace item '" + item.getTitle() + "' rejected by administrator. Reason: " + reason
        );

        notificationService.createAndSendNotification(
                item.getSeller(),
                null,
                NotificationType.GAME_REVIEW_RESULT,
                "Sản phẩm asset \"" + item.getTitle() + "\" của bạn đã bị từ chối xét duyệt." + (reason != null && !reason.isBlank() ? " Lý do: " + reason : ""),
                item.getId().toString()
        );
    }

    @Override
    @Transactional
    public void removeAsset(UUID id, String updaterEmail) {
        Asset item = assetRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        User updater = userRepository.findByEmail(updaterEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        boolean isAdmin = "admin".equalsIgnoreCase(updater.getRole().getName());
        boolean isOwner = item.getSeller().getEmail().equalsIgnoreCase(updaterEmail);

        if (!isAdmin && !isOwner) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String oldStatus = item.getStatus() != null ? item.getStatus().name() : null;
        item.setStatus(ItemStatus.removed);
        assetRepository.save(item);

        try {
            String objectKey = "marketplace/items/" + item.getId().toString() + "/project.zip";
            seaweedFsService.deleteObject(objectKey);
            log.info("Deleted storage file for removed marketplace item: {}", id);
        } catch (Exception e) {
            log.warn("Failed to delete storage file for item: {}. Error: {}", id, e.getMessage());
        }

        auditLogService.publishAuto(
                AuditAction.marketplace_item_removed,
                AuditTarget.marketplace_item,
                id,
                oldStatus,
                ItemStatus.removed.name(),
                "Marketplace item '" + item.getTitle() + "' removed by " + (isAdmin ? "Administrator" : "Owner") + "."
        );
    }

    private Optional<User> resolveRequester(String requesterEmail) {
        if (requesterEmail == null || requesterEmail.isBlank()) {
            return Optional.empty();
        }

        return userRepository.findByEmail(requesterEmail);
    }

    private boolean canAccessPrivateItemFields(Asset item, User requester) {
        if (requester == null) {
            return false;
        }

        return "admin".equalsIgnoreCase(requester.getRole().getName())
                || item.getSeller().getId().equals(requester.getId());
    }

    private AssetResponse mapToResponse(Asset item, boolean includePrivateAccess) {
        // Load media 1 lần, tách theo loại (thumbnail/video/screenshot/asset_image)
        var mediaList = mediaRepository.findByAsset_IdOrderByCreatedAtDesc(item.getId());
        String thumbUrl = mediaList.stream().filter(m -> "thumbnail".equals(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl())).findFirst().orElse(null);
        String vidUrl = mediaList.stream().filter(m -> "video".equals(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl())).findFirst().orElse(null);
        java.util.List<String> shots = mediaList.stream().filter(m -> "screenshot".equals(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl())).toList();
        java.util.List<String> assetImgs = mediaList.stream().filter(m -> "asset_image".equals(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl())).toList();

        return AssetResponse.builder()
                .id(item.getId())
                .sellerId(item.getSeller().getId())
                .sellerEmail(item.getSeller().getEmail())
                .sellerFullName(item.getSeller().getFullName())
                .categoryId(item.getCategory() != null ? item.getCategory().getId() : null)
                .categoryName(item.getCategory() != null ? item.getCategory().getName() : null)
                .title(item.getTitle())
                .description(item.getDescription())
                .price(item.getPrice())
                .fileUrl(includePrivateAccess ? getPresignedGetUrl(item.getFileUrl()) : null)
                .status(item.getStatus())
                .uploadStatus(item.getUploadStatus())
                .uploadError(item.getUploadError())
                .version(item.getVersion())
                .tags(item.getTags() == null ? java.util.List.of() :
                        item.getTags().stream()
                                .map(com.godotlaunch.backend.utils.TranslationUtils::resolveTagName)
                                .toList())
                .mediaUrls(assetImgs)
                .thumbnailUrl(thumbUrl)
                .videoUrl(vidUrl)
                .screenshots(shots)
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    private String getPresignedGetUrl(String rawUrl) {
        return seaweedFsService.resolvePublicUrl(rawUrl);
    }

    private String extractObjectKeyFromUrl(String url) {
        if (url == null) return null;

        // SeaweedFS (e.g. http://localhost:8888/godotlaunch/...)
        String seaweedMarker = "/godotlaunch/";
        int seaweedIndex = url.indexOf(seaweedMarker);
        if (seaweedIndex != -1) {
            return url.substring(seaweedIndex + seaweedMarker.length());
        }

        if (url.startsWith("http://") || url.startsWith("https://")) {
            return null;
        }

        return url;
    }

    @Override
    @Transactional
    public void startUnifiedAssetUpload(UUID itemId, MultipartFile file, String uploaderEmail) {
        User uploader = getRequesterWithRole(uploaderEmail);
        assertDeveloper(uploader);
        Asset item = assetRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        assertAssetOwner(item, uploader);

        // 1. Cập nhật trạng thái PROCESSING
        item.setUploadStatus("PROCESSING");
        item.setUploadError(null);
        assetRepository.saveAndFlush(item);

        // 2. Lưu file MultipartFile tạm thời ra đĩa để chuyển tiếp cho Async Worker
        java.io.File rawZipFile;
        try {
            rawZipFile = java.io.File.createTempFile("unified-raw-" + itemId, ".zip");
            file.transferTo(rawZipFile);
        } catch (java.io.IOException e) {
            log.error("Failed to save temporary raw zip upload for item {}", itemId, e);
            item.setUploadStatus("FAILED");
            item.setUploadError("Không thể lưu tệp tải lên tạm thời: " + e.getMessage());
            assetRepository.save(item);
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to initialize upload payload: " + e.getMessage());
        }

        // 3. Khởi chạy tác vụ nền (Async) sau khi transaction hiện tại commit
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    unifiedAssetUploadHelper.processUnifiedAssetZipAsync(itemId, rawZipFile);
                }
            });
        } else {
            unifiedAssetUploadHelper.processUnifiedAssetZipAsync(itemId, rawZipFile);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public AssetResponse getUploadStatus(UUID itemId, String requesterEmail) {
        User requester = getRequesterWithRole(requesterEmail);
        assertDeveloper(requester);
        Asset item = assetRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        assertAssetOwner(item, requester);

        return mapToResponse(item, true);
    }

    @Override
    @Transactional
    public void reorderScreenshots(UUID itemId, java.util.List<String> orderedUrls, String requesterEmail) {
        User requester = getRequesterWithRole(requesterEmail);
        assertDeveloper(requester);
        Asset item = assetRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        assertAssetOwner(item, requester);

        // 1. Lấy tất cả screenshot hiện tại
        java.util.List<Media> screenshots = mediaRepository.findByAsset_IdAndMediaType(itemId, "screenshot");

        // 2. Cập nhật createdAt theo thứ tự của orderedUrls
        java.time.Instant now = java.time.Instant.now();
        // Đối với OrderByCreatedAtDesc: phần tử đầu tiên hiển thị trước -> phần tử đầu tiên phải có createdAt LỚN NHẤT.
        for (int i = 0; i < orderedUrls.size(); i++) {
            String url = orderedUrls.get(i);
            String objectKey = extractObjectKeyFromUrl(url);
            if (objectKey == null) continue;

            Media match = null;
            for (Media m : screenshots) {
                if (m.getMediaUrl().contains(objectKey)) {
                    match = m;
                    break;
                }
            }

            if (match != null) {
                // Giảm dần createdAt cho mỗi vị trí tiếp theo
                match.setCreatedAt(now.minusSeconds(i));
                mediaRepository.save(match);
            }
        }
    }

    private String calculateSha256(InputStream is) {
        if (is == null) return null;
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = is.read(buffer)) > 0) {
                digest.update(buffer, 0, read);
            }
            byte[] hash = digest.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            log.error("Failed to calculate SHA-256", e);
            return null;
        }
    }

    private String incrementVersion(String currentVersion) {
        if (currentVersion == null || currentVersion.trim().isEmpty()) {
            return "1.0.1";
        }
        try {
            String[] parts = currentVersion.split("\\.");
            if (parts.length > 0) {
                int lastIdx = parts.length - 1;
                try {
                    int lastNum = Integer.parseInt(parts[lastIdx]);
                    parts[lastIdx] = String.valueOf(lastNum + 1);
                    return String.join(".", parts);
                } catch (NumberFormatException e) {
                    return currentVersion + ".1";
                }
            }
        } catch (Exception e) {
            log.warn("Could not increment version: {}", currentVersion, e);
        }
        return "1.0.1";
    }
}
