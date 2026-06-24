package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.UpdateGameRequest;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameMedia;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.FileType;
import com.godotlaunch.backend.dto.request.CreateGameRequest;
import com.godotlaunch.backend.service.AsyncVirusScanService;
import com.godotlaunch.backend.service.AwsS3Service;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.GameService;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.CategoryRepository;
import com.godotlaunch.backend.repository.GameMediaRepository;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.service.AuditLogService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameServiceImpl implements GameService {

    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final GameMediaRepository gameMediaRepository;
    private final AwsS3Service awsS3Service;
    private final AsyncVirusScanService asyncVirusScanService;
    private final EmailService emailService;
    private final StorageRouter storageRouter;
    private final AuditLogService auditLogService;

    /** Map fileType string (từ frontend) → FileType enum cho StorageRouter routing. */
    private FileType resolveMediaFileType(String fileType) {
        if ("thumbnail".equalsIgnoreCase(fileType)) return FileType.thumbnail;
        if ("video".equalsIgnoreCase(fileType)) return FileType.video;
        // "screenshot" | "image"
        return FileType.screenshot;
    }

    /** Build objectKey cố định/random theo loại media. */
    private String buildMediaObjectKey(UUID gameId, String fileType) {
        if ("thumbnail".equalsIgnoreCase(fileType)) {
            return "games/" + gameId + "/thumbnail";
        }
        if ("video".equalsIgnoreCase(fileType)) {
            return "games/" + gameId + "/video";
        }
        // screenshot: mỗi cái 1 key random
        return "games/" + gameId + "/screenshots/" + UUID.randomUUID();
    }

    @Override
    @Transactional
    public UUID createGameDraft(CreateGameRequest request, String creatorEmail) {
        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Game game = new Game();
        game.setTitle(request.getTitle());
        game.setDescription(request.getDescription());
        game.setPriceProposed(request.getPriceProposed());
        game.setCreator(creator);
        game.setStatus(GameStatus.draft);
        game.setPublishingType(request.getPublishingType());

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
            game.setCategory(category);
        }

        Game savedGame = gameRepository.save(game);
        return savedGame.getId();
    }

    @Override
    @Transactional(readOnly = true)
    public GameResponse getGameById(UUID gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
        return mapToResponse(game);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GameResponse> getAllGames() {
        return gameRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GameResponse> getGamesByStatus(GameStatus status) {
        return gameRepository.findByStatus(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GameResponse updateGame(UUID gameId, UpdateGameRequest request, String updaterEmail) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if (!game.getCreator().getEmail().equalsIgnoreCase(updaterEmail)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (request.getTitle() != null) {
            game.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            game.setDescription(request.getDescription());
        }
        if (request.getPriceProposed() != null) {
            game.setPriceProposed(request.getPriceProposed());
        }
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
            game.setCategory(category);
        }
        if (request.getPublishingType() != null) {
            game.setPublishingType(request.getPublishingType());
        }

        Game updatedGame = gameRepository.save(game);

        auditLogService.publishAuto(
                AuditAction.game_updated,
                AuditTarget.game,
                gameId,
                null,
                null,
                "Game '" + updatedGame.getTitle() + "' draft updated by creator."
        );

        return mapToResponse(updatedGame);
    }

    @Override
    @Transactional
    public void clearGameMedia(UUID gameId, String mediaType, String updaterEmail) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if (!game.getCreator().getEmail().equalsIgnoreCase(updaterEmail)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        // Chuẩn hóa: "screenshot" → "image" (DB lưu mediaType là "image")
        String normalized = "video".equalsIgnoreCase(mediaType) ? "video" : "image";
        deleteMediaFilesAndRecords(gameId, normalized);
    }

    @Override
    @Transactional
    public void deleteGameMediaByUrl(UUID gameId, String mediaUrl, String updaterEmail) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if (!game.getCreator().getEmail().equalsIgnoreCase(updaterEmail)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        // Frontend gửi presigned URL — match bằng objectKey (bỏ query string ?X-Amz-...)
        String targetKey = extractObjectKeyFromUrl(mediaUrl);
        if (targetKey == null) {
            throw new IllegalArgumentException("Không xác định được objectKey từ mediaUrl");
        }

        gameMediaRepository.findByGameId(gameId).stream()
                .filter(m -> targetKey.equals(extractObjectKeyFromUrl(m.getMediaUrl())))
                .findFirst()
                .ifPresent(m -> {
                    gameMediaRepository.delete(m);
                    // Route đúng provider theo loại media (image→screenshot, video→video)
                    FileType ft = "video".equalsIgnoreCase(m.getMediaType())
                            ? FileType.video : FileType.screenshot;
                    try {
                        storageRouter.delete(ft, targetKey);
                    } catch (Exception e) {
                        log.warn("Đã xóa record media nhưng không xóa được file storage: {}", targetKey, e);
                    }
                });
    }

    private String getPresignedGetUrl(String rawUrl) {
        if (rawUrl == null) return null;

        // File trên SeaweedFS (hoặc storage khác) đã là public URL → trả thẳng,
        // chỉ S3 mới cần presigned GET URL.
        if (!rawUrl.contains(".amazonaws.com/")) {
            return rawUrl;
        }

        String objectKey = extractObjectKeyFromUrl(rawUrl);
        if (objectKey == null) return rawUrl;
        try {
            return awsS3Service.generatePresignedGetUrl(objectKey, java.time.Duration.ofHours(24));
        } catch (Exception e) {
            log.warn("Failed to generate presigned GET URL for objectKey: {}, returning raw URL. Error: {}", objectKey, e.getMessage());
            return rawUrl;
        }
    }

    private GameResponse mapToResponse(Game game) {
        List<GameMedia> mediaList = gameMediaRepository.findByGameId(game.getId());
        List<String> screenshots = mediaList.stream()
                .filter(m -> "image".equalsIgnoreCase(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl()))
                .collect(Collectors.toList());
        String videoUrl = mediaList.stream()
                .filter(m -> "video".equalsIgnoreCase(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl()))
                .findFirst()
                .orElse(null);

        return GameResponse.builder()
                .id(game.getId())
                .title(game.getTitle())
                .description(game.getDescription())
                .thumbnailUrl(getPresignedGetUrl(game.getThumbnailUrl()))
                .priceProposed(game.getPriceProposed())
                .downloadPrice(null)
                .communityAvailable(game.isSourceListed())
                .status(game.getStatus().name())
                .creatorName(game.getCreator().getEmail())
                .creatorFullName(game.getCreator().getFullName())
                .categoryName(game.getCategory() != null ? game.getCategory().getName() : null)
                .publishingType(game.getPublishingType() != null ? game.getPublishingType().name() : null)
                .screenshots(screenshots)
                .videoUrl(videoUrl)
                .fileUrl(getPresignedGetUrl(game.getFileUrl()))
                .build();
    }


    @Override
    @Transactional(readOnly = true)
    public String getPresignedUploadUrl(UUID gameId, String fileType, String contentType) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        String objectKey;
        if ("thumbnail".equalsIgnoreCase(fileType)) {
            objectKey = "games/" + gameId.toString() + "/thumbnail";
        } else if ("screenshot".equalsIgnoreCase(fileType) || "image".equalsIgnoreCase(fileType)) {
            objectKey = "games/" + gameId.toString() + "/screenshots/" + UUID.randomUUID().toString();
        } else if ("video".equalsIgnoreCase(fileType)) {
            objectKey = "games/" + gameId.toString() + "/video";
        } else {
            objectKey = "games/" + gameId.toString() + "/game.zip";
        }

        return awsS3Service.generatePresignedUploadUrl(objectKey, contentType);
    }

    @Override
    @Transactional
    public void confirmUploadComplete(UUID gameId, String fileType, String objectKey) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if ("thumbnail".equalsIgnoreCase(fileType)) {
            String actualKey = objectKey != null ? objectKey : "games/" + gameId.toString() + "/thumbnail";
            String thumbnailUrl = awsS3Service.getFileUrl(actualKey);
            game.setThumbnailUrl(thumbnailUrl);
            gameRepository.save(game);
        } else if ("screenshot".equalsIgnoreCase(fileType) || "image".equalsIgnoreCase(fileType) || "video".equalsIgnoreCase(fileType)) {
            if (objectKey == null) {
                throw new IllegalArgumentException("objectKey is required to confirm media uploads (screenshots or videos)");
            }
            String mediaUrl = awsS3Service.getFileUrl(objectKey);
            boolean isVideo = "video".equalsIgnoreCase(fileType);

            // Video chỉ có 1 cái/game → upload mới thay thế cái cũ (không giữ lịch sử).
            if (isVideo) {
                gameMediaRepository.deleteByGameIdAndMediaType(gameId, "video");
            }

            GameMedia media = new GameMedia();
            media.setGame(game);
            media.setMediaType(isVideo ? "video" : "image");
            media.setMediaUrl(mediaUrl);
            gameMediaRepository.save(media);
        } else {
            String actualKey = objectKey != null ? objectKey : "games/" + gameId.toString() + "/game.zip";
            String fileUrl = awsS3Service.getFileUrl(actualKey);

            game.setFileUrl(fileUrl);
            gameRepository.save(game);

            asyncVirusScanService.scanAndProcessGame(gameId, actualKey);
        }
    }

    @Override
    @Transactional
    public String uploadGameMedia(UUID gameId, String fileType, MultipartFile file, String uploaderEmail) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if (!game.getCreator().getEmail().equalsIgnoreCase(uploaderEmail)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        FileType ft = resolveMediaFileType(fileType);
        String objectKey = buildMediaObjectKey(gameId, fileType);

        // Upload qua StorageRouter — route đúng provider (S3 / SeaweedFS) theo routing config
        String mediaUrl = storageRouter.uploadWithKey(ft, file, objectKey);

        if ("thumbnail".equalsIgnoreCase(fileType)) {
            game.setThumbnailUrl(mediaUrl);
            gameRepository.save(game);
        } else {
            boolean isVideo = "video".equalsIgnoreCase(fileType);
            // Video chỉ 1 cái/game → thay thế cái cũ
            if (isVideo) {
                deleteMediaFilesAndRecords(gameId, "video");
            }
            GameMedia media = new GameMedia();
            media.setGame(game);
            media.setMediaType(isVideo ? "video" : "image");
            media.setMediaUrl(mediaUrl);
            gameMediaRepository.save(media);
        }

        return objectKey;
    }

    /** Xóa cả file storage (đúng provider) lẫn record DB cho 1 loại media. */
    private void deleteMediaFilesAndRecords(UUID gameId, String mediaType) {
        FileType ft = "video".equalsIgnoreCase(mediaType) ? FileType.video : FileType.screenshot;
        gameMediaRepository.findByGameId(gameId).stream()
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
        gameMediaRepository.deleteByGameIdAndMediaType(gameId, mediaType);
    }

    @Override
    @Transactional
    public void approveGame(UUID gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if (game.getStatus() != GameStatus.pending) {
            throw new IllegalStateException("Game must be in pending status to be approved");
        }

        if (game.getPublishingType() == null || game.getPublishingType() == com.godotlaunch.backend.entity.enums.PublishingType.marketplace_listing) {
            game.setStatus(GameStatus.published);
            gameRepository.save(game);

            emailService.sendGameStatusNotification(
                    game.getCreator().getEmail(),
                    game.getTitle(),
                    "APPROVED and PUBLISHED",
                    "Your game has passed all manual checks and is now live on the store."
            );

            auditLogService.publishAuto(
                    AuditAction.game_published,
                    AuditTarget.game,
                    game.getId(),
                    GameStatus.pending.name(),
                    GameStatus.published.name(),
                    "Game '" + game.getTitle() + "' approved and published by administrator."
            );
        } else {
            game.setStatus(GameStatus.approved);
            gameRepository.save(game);

            emailService.sendGameStatusNotification(
                    game.getCreator().getEmail(),
                    game.getTitle(),
                    "APPROVED - CONTRACT PENDING",
                    "Your game has been approved by the admin. A contract will be drafted. Please check your developer dashboard to review and sign the contract."
            );

            auditLogService.publishAuto(
                    AuditAction.game_approved,
                    AuditTarget.game,
                    game.getId(),
                    GameStatus.pending.name(),
                    GameStatus.approved.name(),
                    "Game '" + game.getTitle() + "' approved by administrator (contract pending)."
            );
        }
    }

    @Override
    @Transactional
    public void rejectGame(UUID gameId, String reason) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if (game.getStatus() != GameStatus.pending) {
            throw new IllegalStateException("Game must be in pending status to be rejected");
        }

        game.setStatus(GameStatus.rejected);

        // Xóa các tệp ZIP, Thumbnail và tất cả Screenshots/Videos trên S3 để giải phóng dung lượng khi bị từ chối
        try {
            String zipKey = "games/" + gameId.toString() + "/game.zip";
            String thumbnailKey = "games/" + gameId.toString() + "/thumbnail";

            awsS3Service.deleteObject(zipKey);
            awsS3Service.deleteObject(thumbnailKey);

            game.setFileUrl(null);
            game.setThumbnailUrl(null);

            // Xóa toàn bộ screenshots và videos trong game_media
            List<GameMedia> mediaList = gameMediaRepository.findByGameId(gameId);
            for (GameMedia media : mediaList) {
                String mediaKey = extractObjectKeyFromUrl(media.getMediaUrl());
                if (mediaKey != null) {
                    awsS3Service.deleteObject(mediaKey);
                }
            }
            gameMediaRepository.deleteByGameId(gameId);
            log.info("Đã xóa tệp ZIP, Thumbnail và {} tệp screenshots/video trên S3 cho game bị từ chối: gameId = {}", mediaList.size(), gameId);
        } catch (Exception e) {
            log.warn("Không thể xóa hoàn toàn tệp tin trên S3 của game bị từ chối: gameId = {}, lỗi = {}", gameId, e.getMessage());
        }

        gameRepository.save(game);

        emailService.sendGameStatusNotification(
                game.getCreator().getEmail(),
                game.getTitle(),
                "REJECTED",
                reason
        );

        auditLogService.publishAuto(
                AuditAction.game_rejected,
                AuditTarget.game,
                game.getId(),
                GameStatus.pending.name(),
                GameStatus.rejected.name(),
                "Game '" + game.getTitle() + "' rejected by administrator. Reason: " + reason
        );
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
