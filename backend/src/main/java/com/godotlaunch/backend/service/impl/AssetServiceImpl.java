package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateAssetRequest;
import com.godotlaunch.backend.dto.request.UpdateAssetRequest;
import com.godotlaunch.backend.dto.response.AssetResponse;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.Asset;
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
    private final com.godotlaunch.backend.service.GitHubRepoService gitHubRepoService;
    private final com.godotlaunch.backend.config.SourceProcessingClient sourceProcessingClient;
    private final com.godotlaunch.backend.repository.SourceSnapshotRepository sourceSnapshotRepository;
    private final com.godotlaunch.backend.repository.MediaRepository mediaRepository;
    private final com.godotlaunch.backend.repository.OrderRepository orderRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final com.godotlaunch.backend.service.AiReviewService aiReviewService;
    private final AuditLogService auditLogService;

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
        User requester = resolveRequester(requesterEmail).orElse(null);
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

        if (request.getTitle() != null) {
            item.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            item.setDescription(request.getDescription());
        }
        if (request.getPrice() != null) {
            item.setPrice(request.getPrice());
        }
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
            item.setCategory(category);
        }
        if (request.getFileUrl() != null) {
            item.setFileUrl(request.getFileUrl());
        }



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

        String objectKey = buildObjectKey(item.getId());
        // Upload qua SeaweedFsService
        String fileUrl = seaweedFsService.uploadWithKey(file, objectKey);
        item.setFileUrl(fileUrl);
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
                .sellerEmail(item.getSeller().getEmail())
                .sellerFullName(item.getSeller().getFullName())
                .categoryId(item.getCategory() != null ? item.getCategory().getId() : null)
                .categoryName(item.getCategory() != null ? item.getCategory().getName() : null)
                .title(item.getTitle())
                .description(item.getDescription())
                .price(item.getPrice())
                .fileUrl(includePrivateAccess ? getPresignedGetUrl(item.getFileUrl()) : null)
                .status(item.getStatus())
                .tags(item.getTags() == null ? java.util.List.of() :
                        item.getTags().stream()
                                .map(com.godotlaunch.backend.entity.Tag::getName)
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
}
