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
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.entity.Tag;
import com.godotlaunch.backend.entity.MarketplaceItemMedia;
import com.godotlaunch.backend.repository.TagRepository;
import com.godotlaunch.backend.repository.MarketplaceItemMediaRepository;
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
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketplaceItemServiceImpl implements MarketplaceItemService {

    private final MarketplaceItemRepository marketplaceItemRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final GameRepository gameRepository;
    private final TagRepository tagRepository;
    private final MarketplaceItemMediaRepository marketplaceItemMediaRepository;
    private final AwsS3Service awsS3Service;
    private final AsyncVirusScanService asyncVirusScanService;
    private final EmailService emailService;
    private final StorageRouter storageRouter;

    /** ObjectKey cố định cho zip của 1 marketplace item. */
    private String buildObjectKey(UUID itemId) {
        return "marketplace/items/" + itemId + "/project.zip";
    }

    /** FileType dùng cho routing — derive từ itemType. */
    private FileType resolveFileType(MarketplaceItem item) {
        return item.getItemType() == ItemType.source_code
                ? FileType.source_code_zip
                : FileType.asset;
    }

    private Set<Tag> resolveTags(List<String> tagNames) {
        if (tagNames == null || tagNames.isEmpty()) {
            return new HashSet<>();
        }
        Set<Tag> resolvedTags = new HashSet<>();
        for (String name : tagNames) {
            String trimmed = name.trim();
            if (trimmed.isEmpty()) continue;
            Tag tag = tagRepository.findByNameIgnoreCase(trimmed)
                    .orElseGet(() -> {
                        Tag newTag = new Tag();
                        newTag.setName(trimmed);
                        newTag.setSlug(trimmed.toLowerCase().replaceAll("[^a-z0-9]+", "-"));
                        return tagRepository.save(newTag);
                    });
            resolvedTags.add(tag);
        }
        return resolvedTags;
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
        
        item.setThumbnailUrl(request.getThumbnailUrl());
        item.setLicense(request.getLicense());
        item.setDocumentation(request.getDocumentation());
        if (request.getVersion() != null && !request.getVersion().trim().isEmpty()) {
            item.setVersion(request.getVersion());
        }
        item.setSupportedPlatforms(request.getSupportedPlatforms());
        if (request.getTags() != null) {
            item.setTags(resolveTags(request.getTags()));
        }

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
            item.setGithubVerifiedAt(Instant.now()); // Auto-verify for now
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

        MarketplaceItem savedItem = marketplaceItemRepository.save(item);
        return savedItem.getId();
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceItemResponse getMarketplaceItemById(UUID id) {
        MarketplaceItem item = marketplaceItemRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));
        return mapToResponse(item);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MarketplaceItemResponse> getAllMarketplaceItems() {
        return marketplaceItemRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MarketplaceItemResponse> getMarketplaceItemsByStatus(ItemStatus status) {
        return marketplaceItemRepository.findByStatus(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MarketplaceItemResponse> getMarketplaceItemsBySeller(String sellerEmail) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return marketplaceItemRepository.findBySellerId(seller.getId()).stream()
                .map(this::mapToResponse)
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
        if (request.getThumbnailUrl() != null) {
            item.setThumbnailUrl(request.getThumbnailUrl());
        }
        if (request.getLicense() != null) {
            item.setLicense(request.getLicense());
        }
        if (request.getDocumentation() != null) {
            item.setDocumentation(request.getDocumentation());
        }
        if (request.getVersion() != null) {
            item.setVersion(request.getVersion());
        }
        if (request.getSupportedPlatforms() != null) {
            item.setSupportedPlatforms(request.getSupportedPlatforms());
        }
        if (request.getTags() != null) {
            item.setTags(resolveTags(request.getTags()));
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
        return mapToResponse(updatedItem);
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

    private MarketplaceItemResponse mapToResponse(MarketplaceItem item) {
        List<String> tags = item.getTags() != null
                ? item.getTags().stream().map(Tag::getName).collect(Collectors.toList())
                : Collections.emptyList();
        List<String> screenshots = item.getMediaFiles() != null
                ? item.getMediaFiles().stream()
                        .filter(m -> "image".equalsIgnoreCase(m.getMediaType()))
                        .map(m -> getPresignedGetUrl(m.getMediaUrl()))
                        .collect(Collectors.toList())
                : Collections.emptyList();

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
                .fileUrl(getPresignedGetUrl(item.getFileUrl()))
                .thumbnailUrl(getPresignedGetUrl(item.getThumbnailUrl()))
                .license(item.getLicense())
                .documentation(item.getDocumentation())
                .version(item.getVersion())
                .supportedPlatforms(item.getSupportedPlatforms())
                .tags(tags)
                .screenshots(screenshots)
                .godotVersion(item.getGodotVersion())
                .sourceGameId(item.getSourceGame() != null ? item.getSourceGame().getId() : null)
                .sourceGameTitle(item.getSourceGame() != null ? item.getSourceGame().getTitle() : null)
                .githubRepoUrl(item.getGithubRepoUrl())
                .githubVerifiedAt(item.getGithubVerifiedAt())
                .status(item.getStatus())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional
    public String uploadMarketplaceItemMedia(UUID itemId, String fileType, MultipartFile file, String uploaderEmail) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        if (!item.getSeller().getEmail().equalsIgnoreCase(uploaderEmail)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        FileType ft = resolveMediaFileType(fileType);
        String objectKey = buildMarketplaceMediaObjectKey(itemId, fileType);

        String mediaUrl = storageRouter.uploadWithKey(ft, file, objectKey);

        if ("thumbnail".equalsIgnoreCase(fileType)) {
            item.setThumbnailUrl(mediaUrl);
            marketplaceItemRepository.save(item);
        } else {
            boolean isVideo = "video".equalsIgnoreCase(fileType);
            if (isVideo) {
                deleteMarketplaceMediaFilesAndRecords(itemId, "video");
            }
            MarketplaceItemMedia media = new MarketplaceItemMedia();
            media.setMarketplaceItem(item);
            media.setMediaType(isVideo ? "video" : "image");
            media.setMediaUrl(mediaUrl);
            marketplaceItemMediaRepository.save(media);
        }

        return objectKey;
    }

    @Override
    @Transactional
    public void deleteMarketplaceItemMediaByUrl(UUID itemId, String mediaUrl, String uploaderEmail) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        if (!item.getSeller().getEmail().equalsIgnoreCase(uploaderEmail)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String targetKey = extractObjectKeyFromUrl(mediaUrl);
        if (targetKey == null) {
            throw new IllegalArgumentException("Không xác định được objectKey từ mediaUrl");
        }

        marketplaceItemMediaRepository.findByMarketplaceItemId(itemId).stream()
                .filter(m -> targetKey.equals(extractObjectKeyFromUrl(m.getMediaUrl())))
                .findFirst()
                .ifPresent(m -> {
                    marketplaceItemMediaRepository.delete(m);
                    FileType ft = "video".equalsIgnoreCase(m.getMediaType())
                            ? FileType.video : FileType.screenshot;
                    try {
                        storageRouter.delete(ft, targetKey);
                    } catch (Exception e) {
                        log.warn("Đã xóa record media nhưng không xóa được file storage: {}", targetKey, e);
                    }
                });
    }

    private FileType resolveMediaFileType(String fileType) {
        if ("thumbnail".equalsIgnoreCase(fileType)) return FileType.thumbnail;
        if ("video".equalsIgnoreCase(fileType)) return FileType.video;
        return FileType.screenshot;
    }

    private String buildMarketplaceMediaObjectKey(UUID itemId, String fileType) {
        if ("thumbnail".equalsIgnoreCase(fileType)) {
            return "marketplace/items/" + itemId + "/thumbnail";
        }
        if ("video".equalsIgnoreCase(fileType)) {
            return "marketplace/items/" + itemId + "/video";
        }
        return "marketplace/items/" + itemId + "/screenshots/" + UUID.randomUUID().toString();
    }

    private void deleteMarketplaceMediaFilesAndRecords(UUID itemId, String mediaType) {
        FileType ft = "video".equalsIgnoreCase(mediaType) ? FileType.video : FileType.screenshot;
        marketplaceItemMediaRepository.findByMarketplaceItemId(itemId).stream()
                .filter(m -> mediaType.equalsIgnoreCase(m.getMediaType()))
                .forEach(m -> {
                    String key = extractObjectKeyFromUrl(m.getMediaUrl());
                    if (key != null) {
                        try {
                            storageRouter.delete(ft, key);
                        } catch (Exception e) {
                            log.warn("Không xóa được file media trên storage: {}", key, e);
                        }
                    }
                });
        marketplaceItemMediaRepository.deleteByMarketplaceItemIdAndMediaType(itemId, mediaType);
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
