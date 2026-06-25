package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.CreateMarketplaceItemRequest;
import com.godotlaunch.backend.dto.request.UpdateMarketplaceItemRequest;
import com.godotlaunch.backend.dto.response.MarketplaceItemResponse;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.MarketplaceItem;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.FileType;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.entity.enums.ItemType;
import com.godotlaunch.backend.entity.enums.OrderStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.CategoryRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.MarketplaceItemRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AsyncVirusScanService;
import com.godotlaunch.backend.service.AwsS3Service;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.MarketplaceItemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketplaceItemServiceImpl implements MarketplaceItemService {

    private final MarketplaceItemRepository marketplaceItemRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final GameRepository gameRepository;
    private final com.godotlaunch.backend.repository.TagRepository tagRepository;
    private final AwsS3Service awsS3Service;
    private final AsyncVirusScanService asyncVirusScanService;
    private final EmailService emailService;
    private final StorageRouter storageRouter;
    private final com.godotlaunch.backend.service.GitHubRepoService gitHubRepoService;
    private final com.godotlaunch.backend.config.SourceProcessingClient sourceProcessingClient;
    private final com.godotlaunch.backend.repository.SourceSnapshotRepository sourceSnapshotRepository;
    private final com.godotlaunch.backend.repository.MediaRepository mediaRepository;
    private final com.godotlaunch.backend.repository.OrderRepository orderRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final com.godotlaunch.backend.service.AiReviewService aiReviewService;

    /** ObjectKey cố định cho zip của 1 marketplace item. */
    private String buildObjectKey(UUID itemId) {
        return "marketplace/items/" + itemId + "/project.zip";
    }

    /** FileType cho upload file. Chỉ asset upload file (source_code dùng repo) → asset_media. */
    private FileType resolveFileType(MarketplaceItem item) {
        return FileType.asset_media;
    }

    @Override
    @Transactional
    public UUID createMarketplaceItem(CreateMarketplaceItemRequest request, String sellerEmail) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!seller.isFaceVerified()) {
            throw new AppException(ErrorCode.FACE_VERIFY_REQUIRED);
        }

        MarketplaceItem item = new MarketplaceItem();
        item.setSeller(seller);
        item.setItemType(request.getItemType());
        item.setTitle(request.getTitle());
        item.setDescription(request.getDescription());
        item.setPrice(request.getPrice());
        item.setStatus(ItemStatus.pending);

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
            item.setCategory(category);
        }

        if (request.getSourceGameId() != null) {
            Game game = gameRepository.findById(request.getSourceGameId())
                    .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
            item.setSourceGame(game);
        }

        // Handle constraints for source_code
        if (request.getItemType() == ItemType.source_code) {
            if (request.getGodotVersion() == null || request.getGodotVersion().trim().isEmpty()) {
                throw new AppException(ErrorCode.INVALID_INPUT);
            }
            if (request.getGithubRepoUrl() == null || request.getGithubRepoUrl().trim().isEmpty()) {
                throw new AppException(ErrorCode.INVALID_INPUT);
            }
            item.setGodotVersion(request.getGodotVersion());
            item.setGithubRepoUrl(request.getGithubRepoUrl());
            // KHÔNG auto-verify — repo được clone/scan/snapshot thật ở submitItemRepo (Step 2)
        } else {
            item.setGodotVersion(request.getGodotVersion());
            item.setGithubRepoUrl(request.getGithubRepoUrl());
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

        MarketplaceItem savedItem = marketplaceItemRepository.save(item);
        return savedItem.getId();
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceItemResponse getMarketplaceItemById(UUID id, String requesterEmail) {
        MarketplaceItem item = marketplaceItemRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        return mapToResponse(item, canAccessPrivateItemFields(item, resolveRequester(requesterEmail).orElse(null)));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MarketplaceItemResponse> getAllMarketplaceItems(String requesterEmail) {
        User requester = resolveRequester(requesterEmail).orElse(null);
        return marketplaceItemRepository.findAll().stream()
                .map(item -> mapToResponse(item, canAccessPrivateItemFields(item, requester)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MarketplaceItemResponse> getMarketplaceItemsByStatus(ItemStatus status, String requesterEmail) {
        User requester = resolveRequester(requesterEmail).orElse(null);
        return marketplaceItemRepository.findByStatus(status).stream()
                .map(item -> mapToResponse(item, canAccessPrivateItemFields(item, requester)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MarketplaceItemResponse> getMarketplaceItemsBySeller(String sellerEmail) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return marketplaceItemRepository.findBySellerId(seller.getId()).stream()
                .map(item -> mapToResponse(item, true))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MarketplaceItemResponse updateMarketplaceItem(UUID id, UpdateMarketplaceItemRequest request, String updaterEmail) {
        MarketplaceItem item = marketplaceItemRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        if (!item.getSeller().getEmail().equalsIgnoreCase(updaterEmail)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

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

        if (item.getItemType() == ItemType.source_code) {
            if (request.getGodotVersion() != null) {
                if (request.getGodotVersion().trim().isEmpty()) {
                    throw new AppException(ErrorCode.INVALID_INPUT);
                }
                item.setGodotVersion(request.getGodotVersion());
            }
            if (request.getGithubRepoUrl() != null) {
                if (request.getGithubRepoUrl().trim().isEmpty()) {
                    throw new AppException(ErrorCode.INVALID_INPUT);
                }
                item.setGithubRepoUrl(request.getGithubRepoUrl());
                item.setGithubVerifiedAt(Instant.now()); // Auto-verify updated repo
            }
        } else {
            if (request.getGodotVersion() != null) {
                item.setGodotVersion(request.getGodotVersion());
            }
            if (request.getGithubRepoUrl() != null) {
                item.setGithubRepoUrl(request.getGithubRepoUrl());
            }
        }

        MarketplaceItem updatedItem = marketplaceItemRepository.save(item);
        return mapToResponse(updatedItem, true);
    }

    @Override
    @Transactional(readOnly = true)
    public String getPresignedUploadUrl(UUID itemId, String contentType) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        String objectKey = buildObjectKey(item.getId());
        return awsS3Service.generatePresignedUploadUrl(objectKey, contentType);
    }

    @Override
    @Transactional
    public void uploadItemFile(UUID itemId, MultipartFile file, String uploaderEmail) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        // Chỉ seller sở hữu item mới được upload
        if (!item.getSeller().getEmail().equals(uploaderEmail)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String objectKey = buildObjectKey(item.getId());
        FileType fileType = resolveFileType(item);

        // Upload qua StorageRouter — tôn trọng routing config (S3 / SeaweedFS)
        String fileUrl = storageRouter.uploadWithKey(fileType, file, objectKey);
        item.setFileUrl(fileUrl);
        marketplaceItemRepository.save(item);

        asyncVirusScanService.scanAndProcessMarketplaceItem(itemId, objectKey);
        log.info("Marketplace item {} uploaded via StorageRouter ({}) with key {}, virus scan started",
                itemId, storageRouter.getProvider(fileType), objectKey);

        // Asset (upload file, không repo): AI review media-only (CLIP + NSFW). Fail-soft.
        // source_code chạy AI review ở submitItemRepo (sau snapshot), không lặp ở đây.
        if (item.getItemType() == ItemType.asset) {
            aiReviewService.reviewMarketplaceItemAsync(itemId);
        }
    }

    @Override
    @Transactional
    public void submitItemRepo(UUID itemId, String repoUrl, String branch, String sellerEmail) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        if (!item.getSeller().getId().equals(seller.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        if (item.getItemType() != ItemType.source_code) {
            throw new AppException(ErrorCode.INVALID_INPUT); // asset dùng upload file, không repo
        }
        if (repoUrl == null || repoUrl.isBlank()) {
            throw new AppException(ErrorCode.REPO_URL_REQUIRED);
        }

        // 1. Verify owner TRƯỚC — repo phải thuộc về chính seller (chống đánh cắp repo người khác).
        //    Chạy trước checkAccess để A submit repo của B bị chặn ngay (không nhảy vào "mời bot").
        gitHubRepoService.verifyOwnership(seller, repoUrl);

        // 2. Repo của họ nhưng private chưa cấp quyền bot → báo mời bot
        com.godotlaunch.backend.service.GitHubRepoService.RepoAccess access =
                gitHubRepoService.checkAccess(repoUrl);
        if (access == com.godotlaunch.backend.service.GitHubRepoService.RepoAccess.PRIVATE_NO_ACCESS) {
            throw new AppException(ErrorCode.REPO_NEEDS_BOT);
        }

        // 3. clone + scan + snapshot
        String token = gitHubRepoService.getCloneToken(repoUrl);
        com.godotlaunch.backend.dto.response.SourceProcessResult result;
        try {
            result = sourceProcessingClient.process(repoUrl, token, branch);
        } catch (com.godotlaunch.backend.config.SourceProcessingClient.SourceProcessingException e) {
            throw new AppException(ErrorCode.SOURCE_PROCESSING_FAILED);
        }

        // 4. Mã độc → removed
        if (!result.isClean()) {
            item.setStatus(ItemStatus.removed);
            marketplaceItemRepository.save(item);
            saveSnapshotForItem(item, seller, repoUrl, result);
            throw new AppException(ErrorCode.SOURCE_MALWARE_DETECTED);
        }

        // Không phải Godot project hợp lệ → từ chối
        if (!result.isGodotProject()) {
            log.warn("Marketplace repo {} không phải Godot project (hasProjectGodot={}, hasGodotSource={})",
                    repoUrl, result.isHasProjectGodot(), result.isHasGodotSource());
            throw new AppException(ErrorCode.NOT_GODOT_PROJECT);
        }

        // 5. Sạch → lưu repo + snapshot → pending (chờ admin duyệt)
        item.setGithubRepoUrl(repoUrl);
        item.setGithubVerifiedAt(Instant.now());
        item.setFileUrl(repoUrl); // fileUrl NOT NULL — dùng repoUrl làm nguồn
        item.setStatus(ItemStatus.pending);
        marketplaceItemRepository.save(item);

        saveSnapshotForItem(item, seller, repoUrl, result);
        log.info("Marketplace source_code item {} submit qua repo, verified & snapshot. Chờ duyệt.", itemId);

        // AI review async (code + media) — tạo report đề xuất cho admin. Fail-soft.
        aiReviewService.reviewMarketplaceItemAsync(itemId);
    }

    @Override
    public boolean acceptBotInvitation(String repoUrl, String sellerEmail) {
        userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (repoUrl == null || repoUrl.isBlank()) {
            throw new AppException(ErrorCode.REPO_URL_REQUIRED);
        }
        return gitHubRepoService.acceptBotInvitation(repoUrl);
    }

    @Override
    @Transactional
    public String uploadItemMedia(UUID itemId, String mediaType, MultipartFile file, String uploaderEmail) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        if (!item.getSeller().getEmail().equalsIgnoreCase(uploaderEmail)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        // Chuẩn hóa media_type: thumbnail | screenshot | video | asset_image
        String type = switch (mediaType == null ? "" : mediaType.toLowerCase()) {
            case "thumbnail" -> "thumbnail";
            case "video"     -> "video";
            case "screenshot", "image" -> "screenshot";
            default -> "asset_image";
        };

        var ownerType = com.godotlaunch.backend.entity.enums.MediaOwnerType.marketplace_item;
        // thumbnail & video chỉ 1 cái/item → thay thế cái cũ
        if ("thumbnail".equals(type) || "video".equals(type)) {
            deleteItemMediaByType(itemId, type);
        }

        String objectKey = "marketplace/items/" + itemId + "/media/" + UUID.randomUUID();
        String mediaUrl = storageRouter.uploadWithKey(FileType.asset_media, file, objectKey);

        com.godotlaunch.backend.entity.Media media = new com.godotlaunch.backend.entity.Media();
        media.setOwnerType(ownerType);
        media.setOwnerId(itemId);
        media.setMediaType(type);
        media.setMediaUrl(mediaUrl);
        mediaRepository.save(media);

        return objectKey;
    }

    @Override
    @Transactional
    public void deleteAssetMedia(UUID itemId, String mediaUrl, String uploaderEmail) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        if (!item.getSeller().getEmail().equalsIgnoreCase(uploaderEmail)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String targetKey = extractObjectKeyFromUrl(mediaUrl);
        mediaRepository.findByOwnerTypeAndOwnerId(
                        com.godotlaunch.backend.entity.enums.MediaOwnerType.marketplace_item, itemId).stream()
                .filter(m -> targetKey != null && targetKey.equals(extractObjectKeyFromUrl(m.getMediaUrl())))
                .findFirst()
                .ifPresent(m -> {
                    mediaRepository.delete(m);
                    try {
                        storageRouter.delete(FileType.asset_media, targetKey);
                    } catch (Exception e) {
                        log.warn("Đã xóa record asset media nhưng không xóa được file: {}", targetKey, e);
                    }
                });
    }

    @Override
    @Transactional
    public String uploadMarketplaceItemMedia(UUID id, String fileType, MultipartFile file, String uploaderEmail) {
        return uploadItemMedia(id, fileType, file, uploaderEmail);
    }

    @Override
    @Transactional
    public void deleteMarketplaceItemMediaByUrl(UUID id, String mediaUrl, String uploaderEmail) {
        deleteAssetMedia(id, mediaUrl, uploaderEmail);
    }

    /** Xóa toàn bộ media 1 loại của item (dùng khi thay thumbnail/video). */
    private void deleteItemMediaByType(UUID itemId, String mediaType) {
        var ownerType = com.godotlaunch.backend.entity.enums.MediaOwnerType.marketplace_item;
        mediaRepository.findByOwnerTypeAndOwnerIdAndMediaType(ownerType, itemId, mediaType)
                .forEach(m -> {
                    String key = extractObjectKeyFromUrl(m.getMediaUrl());
                    if (key != null) {
                        try { storageRouter.delete(FileType.asset_media, key); } catch (Exception ignored) {}
                    }
                    mediaRepository.delete(m);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public String getSourceBundleUrl(UUID itemId, String requesterEmail) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        boolean isAdmin = "admin".equalsIgnoreCase(requester.getRole().getName());
        boolean isSeller = item.getSeller().getId().equals(requester.getId());
        boolean hasPurchased = orderRepository.existsByBuyerIdAndMarketplaceItemIdAndOrderStatus(
                requester.getId(), itemId, OrderStatus.PAID);

        // Chỉ admin / seller / người đã mua được tải source bundle
        if (!isAdmin && !isSeller && !hasPurchased) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String bundleUrl = sourceSnapshotRepository.findByMarketplaceItemIdOrderByCreatedAtDesc(itemId).stream()
                .map(com.godotlaunch.backend.entity.SourceSnapshot::getBundleUrl)
                .filter(u -> u != null && !u.isBlank())
                .findFirst()
                .orElse(null);
        if (bundleUrl == null) {
            throw new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND);
        }
        return getPresignedGetUrl(bundleUrl);
    }

    /** Lưu snapshot bất biến cho marketplace item. */
    private void saveSnapshotForItem(MarketplaceItem item, User seller, String repoUrl,
                                     com.godotlaunch.backend.dto.response.SourceProcessResult result) {
        try {
            com.godotlaunch.backend.entity.SourceSnapshot snap = new com.godotlaunch.backend.entity.SourceSnapshot();
            snap.setMarketplaceItem(item);
            snap.setSubmittedBy(seller);
            snap.setRepoUrl(repoUrl);
            snap.setCommitSha(result.getCommitSha());
            snap.setBundleHash(result.getBundleHash());
            snap.setFileCount(result.getFileCount());
            snap.setGodotProject(result.isGodotProject());
            snap.setVirusClean(result.isClean());
            snap.setVirusScanned(result.isScanned());
            snap.setFileHashes(toJson(result.getFileHashes()));
            snap.setSecretsFound(toJson(result.getSecrets()));
            // Upload source bundle lên storage cho AI đọc lại + admin/người mua tải
            snap.setBundleUrl(uploadSourceBundle(result, "marketplace/items/" + item.getId()));
            sourceSnapshotRepository.save(snap);
        } catch (Exception e) {
            log.warn("Không lưu được snapshot cho marketplace item {}: {}", item.getId(), e.getMessage());
        }
    }

    private String toJson(Object obj) {
        try {
            return obj == null ? null : objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return null;
        }
    }

    /** Upload source bundle (base64 zip từ Python) lên storage qua StorageRouter(source_bundle). */
    private String uploadSourceBundle(com.godotlaunch.backend.dto.response.SourceProcessResult result, String prefix) {
        if (result.getBundleBase64() == null || result.getBundleBase64().isBlank()) {
            return null;
        }
        try {
            byte[] zipBytes = java.util.Base64.getDecoder().decode(result.getBundleBase64());
            String objectKey = prefix + "/source-bundle.zip";
            var file = new com.godotlaunch.backend.util.ByteArrayMultipartFile(
                    zipBytes, "file", "source-bundle.zip", "application/zip");
            return storageRouter.uploadWithKey(FileType.source_bundle, file, objectKey);
        } catch (Exception e) {
            log.warn("Không upload được source bundle (prefix={}): {}", prefix, e.getMessage());
            return null;
        }
    }

    @Override
    @Transactional
    public void confirmUploadComplete(UUID itemId, String objectKey) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        String actualKey = objectKey != null ? objectKey : buildObjectKey(item.getId());
        String fileUrl = awsS3Service.getFileUrl(actualKey);
        item.setFileUrl(fileUrl);
        marketplaceItemRepository.save(item);

        asyncVirusScanService.scanAndProcessMarketplaceItem(itemId, actualKey);
        log.info("Marketplace item {} upload confirmed with key {} and virus scan started", itemId, actualKey);
    }

    @Override
    @Transactional
    public void approveMarketplaceItem(UUID id) {
        MarketplaceItem item = marketplaceItemRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        if (item.getStatus() != ItemStatus.pending) {
            throw new IllegalStateException("Marketplace item must be in pending status to be approved");
        }

        item.setStatus(ItemStatus.active);
        marketplaceItemRepository.save(item);

        emailService.sendMarketplaceItemStatusNotification(
                item.getSeller().getEmail(),
                item.getTitle(),
                "APPROVED",
                "Your marketplace asset has been approved by the admin and is now active on the marketplace."
        );
        log.info("Marketplace item {} approved and email sent to {}", id, item.getSeller().getEmail());
    }

    @Override
    @Transactional
    public void rejectMarketplaceItem(UUID id, String reason) {
        MarketplaceItem item = marketplaceItemRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        if (item.getStatus() != ItemStatus.pending) {
            throw new IllegalStateException("Marketplace item must be in pending status to be rejected");
        }

        item.setStatus(ItemStatus.rejected);
        marketplaceItemRepository.save(item);

        // Delete S3 zip file
        try {
            String objectKey = "marketplace/items/" + item.getId().toString() + "/project.zip";
            awsS3Service.deleteObject(objectKey);
            log.info("Deleted S3 file for rejected marketplace item: {}", id);
        } catch (Exception e) {
            log.warn("Failed to delete S3 file for item: {}. Error: {}", id, e.getMessage());
        }

        emailService.sendMarketplaceItemStatusNotification(
                item.getSeller().getEmail(),
                item.getTitle(),
                "REJECTED",
                reason != null ? reason : "Violated store policies"
        );
        log.info("Marketplace item {} rejected and email sent to {}", id, item.getSeller().getEmail());
    }

    @Override
    @Transactional
    public void removeMarketplaceItem(UUID id, String updaterEmail) {
        MarketplaceItem item = marketplaceItemRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        User updater = userRepository.findByEmail(updaterEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        boolean isAdmin = "admin".equalsIgnoreCase(updater.getRole().getName());
        boolean isOwner = item.getSeller().getEmail().equalsIgnoreCase(updaterEmail);

        if (!isAdmin && !isOwner) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        item.setStatus(ItemStatus.removed);
        marketplaceItemRepository.save(item);

        try {
            String objectKey = "marketplace/items/" + item.getId().toString() + "/project.zip";
            awsS3Service.deleteObject(objectKey);
            log.info("Deleted S3 file for removed marketplace item: {}", id);
        } catch (Exception e) {
            log.warn("Failed to delete S3 file for item: {}. Error: {}", id, e.getMessage());
        }
    }

    private Optional<User> resolveRequester(String requesterEmail) {
        if (requesterEmail == null || requesterEmail.isBlank()) {
            return Optional.empty();
        }

        return userRepository.findByEmail(requesterEmail);
    }

    private boolean canAccessPrivateItemFields(MarketplaceItem item, User requester) {
        if (requester == null) {
            return false;
        }

        return "admin".equalsIgnoreCase(requester.getRole().getName())
                || item.getSeller().getId().equals(requester.getId());
    }

    private MarketplaceItemResponse mapToResponse(MarketplaceItem item, boolean includePrivateAccess) {
        // Load media 1 lần, tách theo loại (thumbnail/video/screenshot/asset_image)
        var mediaList = mediaRepository.findByOwnerTypeAndOwnerId(
                com.godotlaunch.backend.entity.enums.MediaOwnerType.marketplace_item, item.getId());
        String thumbUrl = mediaList.stream().filter(m -> "thumbnail".equals(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl())).findFirst().orElse(null);
        String vidUrl = mediaList.stream().filter(m -> "video".equals(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl())).findFirst().orElse(null);
        java.util.List<String> shots = mediaList.stream().filter(m -> "screenshot".equals(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl())).toList();
        java.util.List<String> assetImgs = mediaList.stream().filter(m -> "asset_image".equals(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl())).toList();

        return MarketplaceItemResponse.builder()
                .id(item.getId())
                .sellerEmail(item.getSeller().getEmail())
                .sellerFullName(item.getSeller().getFullName())
                .categoryId(item.getCategory() != null ? item.getCategory().getId() : null)
                .categoryName(item.getCategory() != null ? item.getCategory().getName() : null)
                .itemType(item.getItemType())
                .title(item.getTitle())
                .description(item.getDescription())
                .price(item.getPrice())
                .fileUrl(includePrivateAccess ? getPresignedGetUrl(item.getFileUrl()) : null)
                .godotVersion(item.getGodotVersion())
                .sourceGameId(item.getSourceGame() != null ? item.getSourceGame().getId() : null)
                .sourceGameTitle(item.getSourceGame() != null ? item.getSourceGame().getTitle() : null)
                .githubRepoUrl(includePrivateAccess ? item.getGithubRepoUrl() : null)
                .githubVerifiedAt(item.getGithubVerifiedAt())
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
        if (rawUrl == null || "pending".equalsIgnoreCase(rawUrl)) return rawUrl;
        String objectKey = extractObjectKeyFromUrl(rawUrl);
        if (objectKey == null) return rawUrl;
        try {
            return awsS3Service.generatePresignedGetUrl(objectKey, Duration.ofHours(24));
        } catch (Exception e) {
            log.warn("Failed to generate presigned GET URL for objectKey: {}, returning raw URL. Error: {}", objectKey, e.getMessage());
            return rawUrl;
        }
    }

    private String extractObjectKeyFromUrl(String url) {
        if (url == null) return null;
        String prefix = ".amazonaws.com/";
        int index = url.indexOf(prefix);
        if (index != -1) {
            return url.substring(index + prefix.length());
        }
        return url;
    }
}
