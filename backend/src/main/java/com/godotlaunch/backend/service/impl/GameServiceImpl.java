package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.UpdateGameRequest;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameMedia;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.enums.GameStatus;
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

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
        return mapToResponse(updatedGame);
    }

    private GameResponse mapToResponse(Game game) {
        List<GameMedia> mediaList = gameMediaRepository.findByGameId(game.getId());
        List<String> screenshots = mediaList.stream()
                .filter(m -> "image".equalsIgnoreCase(m.getMediaType()))
                .map(GameMedia::getMediaUrl)
                .collect(Collectors.toList());
        String videoUrl = mediaList.stream()
                .filter(m -> "video".equalsIgnoreCase(m.getMediaType()))
                .map(GameMedia::getMediaUrl)
                .findFirst()
                .orElse(null);

        return GameResponse.builder()
                .id(game.getId())
                .title(game.getTitle())
                .description(game.getDescription())
                .thumbnailUrl(game.getThumbnailUrl())
                .priceProposed(game.getPriceProposed())
                .downloadPrice(null)
                .communityAvailable(game.isSourceListed())
                .status(game.getStatus().name())
                .creatorName(game.getCreator().getEmail())
                .categoryName(game.getCategory() != null ? game.getCategory().getName() : null)
                .publishingType(game.getPublishingType() != null ? game.getPublishingType().name() : null)
                .screenshots(screenshots)
                .videoUrl(videoUrl)
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

            GameMedia media = new GameMedia();
            media.setGame(game);
            media.setMediaType("video".equalsIgnoreCase(fileType) ? "video" : "image");
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
    public void approveGame(UUID gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if (game.getStatus() != GameStatus.pending) {
            throw new IllegalStateException("Game must be in pending status to be approved");
        }

        game.setStatus(GameStatus.published);
        gameRepository.save(game);

        emailService.sendGameStatusNotification(
                game.getCreator().getEmail(),
                game.getTitle(),
                "APPROVED and PUBLISHED",
                "Your game has passed all manual checks and is now live on the store."
        );
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
