package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.request.UpdateGameRequest;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.Category;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.dto.request.CreateGameRequest;
import com.godotlaunch.backend.dto.response.SourceProcessResult;
import com.godotlaunch.backend.config.SourceProcessingClient;
import com.godotlaunch.backend.service.GitHubRepoService;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.util.VersionUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.service.AsyncVirusScanService;
import com.godotlaunch.backend.service.SeaweedFsService;
import com.godotlaunch.backend.service.ClamAVService;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.GameService;
import com.godotlaunch.backend.service.NotificationService;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.repository.CategoryRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.service.AuditLogService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameServiceImpl implements GameService {

    private static final long MAX_IMAGE_SIZE_BYTES = 10L * 1024 * 1024; // 10MB cho thumbnail/screenshot
    private static final long MAX_VIDEO_SIZE_BYTES = 50L * 1024 * 1024; // 50MB cho video demo

    @Value("${app.backend-url:http://localhost:8080}")
    private String backendUrl;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    private final GameRepository gameRepository;
    private final GameVersionRepository gameVersionRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final MediaRepository mediaRepository;
    private final com.godotlaunch.backend.repository.TagRepository tagRepository;
    private final UnifiedGameUploadHelper unifiedGameUploadHelper;

    /** Helper: tìm media của game này. */
    private List<Media> gameMedia(UUID gameId) {
        return mediaRepository.findByGame_IdOrderByCreatedAtDesc(gameId);
    }
    private List<String> getLiveScreenshots(UUID gameId) {
        return mediaRepository.findByGame_IdOrderByCreatedAtDesc(gameId).stream()
                .filter(m -> "image".equalsIgnoreCase(m.getMediaType()) || "screenshot".equalsIgnoreCase(m.getMediaType()))
                .map(Media::getMediaUrl)
                .collect(Collectors.toList());
    }
    private final SeaweedFsService seaweedFsService;
    private final ClamAVService clamAVService;
    private final AsyncVirusScanService asyncVirusScanService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final GitHubRepoService gitHubRepoService;
    private final SourceProcessingClient sourceProcessingClient;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final com.godotlaunch.backend.repository.PlagiarismFlagRepository plagiarismFlagRepository;
    private final ObjectMapper objectMapper;
    private final com.godotlaunch.backend.service.AiReviewService aiReviewService;

    /** Build objectKey cố định/random theo loại media với đuôi mở rộng gốc. */
    private String buildMediaObjectKey(UUID gameId, String fileType, MultipartFile file) {
        String ext = "";
        if (file != null && file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")) {
            ext = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf("."));
        }
        // thumbnail/video: key random mỗi lần upload (không tái dùng key cũ) để tránh
        // browser cache ảnh cũ khi developer thay ảnh mới (cùng URL cũ -> trình duyệt hiển thị bản cache).
        if ("thumbnail".equalsIgnoreCase(fileType)) {
            return "games/" + gameId + "/thumbnail_" + UUID.randomUUID() + ext;
        }
        if ("video".equalsIgnoreCase(fileType)) {
            return "games/" + gameId + "/video_" + UUID.randomUUID() + ext;
        }
        // screenshot: mỗi cái 1 key random
        return "games/" + gameId + "/screenshots/" + UUID.randomUUID() + ext;
    }

    /** Chặn ảnh/video gốc quá nặng (VD: ảnh chụp trực tiếp từ điện thoại) làm chậm tải trang cho người xem. */
    private void validateMediaFileSize(String fileType, MultipartFile file) {
        boolean isVideo = "video".equalsIgnoreCase(fileType);
        long max = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
        if (file != null && file.getSize() > max) {
            throw new AppException(ErrorCode.MEDIA_FILE_TOO_LARGE);
        }
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

    private void assertGameOwner(Game game, User requester) {
        if (!game.getCreator().getId().equals(requester.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    private void validateUpdateDependency(Game game, String fileType) {
        boolean isLive = game.getStatus() == GameStatus.published
                || game.getStatus() == GameStatus.approved
                || game.getStatus() == GameStatus.awaiting_store_build;

        if (isLive) {
            if ("game".equalsIgnoreCase(fileType)) {
                return;
            }
            if (game.getPendingUpdateSnapshot() == null) {
                throw new AppException(ErrorCode.UPDATE_REQUIRES_CODE_UPDATE);
            }
        }
    }

    @Override
    @Transactional
    public UUID createGameDraft(CreateGameRequest request, String creatorEmail) {
        User creator = getRequesterWithRole(creatorEmail);
        assertDeveloper(creator);

        Game game = new Game();
        game.setTitle(request.getTitle());
        game.setDescription(request.getDescription());
        game.setPriceProposed(request.getPriceProposed());
        game.setCreator(creator);
        game.setStatus(GameStatus.draft);
        game.setPublishingType(request.getPublishingType());
        game.setSourceListed(request.getPublishingType() == com.godotlaunch.backend.entity.enums.PublishingType.marketplace_listing);
        game.setGithubRepoUrl(request.getGithubRepoUrl());
        game.setGithubBranch(request.getGithubBranch());

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
            game.setCategory(category);
        }

        // Tags (nhiều-nhiều, do developer chọn ở UploadPage)
        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            game.setTags(new java.util.HashSet<>(tagRepository.findByIdIn(request.getTagIds())));
        }

        Game savedGame = gameRepository.save(game);

        // Khởi tạo GameVersion 1.0.0 mặc định
        GameVersion initialVersion = new GameVersion();
        initialVersion.setGame(savedGame);
        initialVersion.setVersionNumber("1.0.0");
        initialVersion.setChangelog("Initial draft");
        initialVersion.setFileUrl("pending");
        initialVersion.setCurrent(true);
        gameVersionRepository.save(initialVersion);

        return savedGame.getId();
    }

    @Override
    @Transactional
    public void submitGameRepo(UUID gameId, String repoUrl, String branch, String creatorEmail) {
        User creator = getRequesterWithRole(creatorEmail);
        assertDeveloper(creator);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        assertGameOwner(game, creator);
        if (repoUrl == null || repoUrl.isBlank()) {
            throw new AppException(ErrorCode.REPO_URL_REQUIRED);
        }

        // 1. Verify owner TRƯỚC — repo phải thuộc về chính creator (chống đánh cắp repo người khác).
        //    Chạy trước checkAccess để A submit repo của B bị chặn ngay (không nhảy vào "mời bot").
        gitHubRepoService.verifyOwnership(creator, repoUrl);

        // 2. Kiểm tra hệ thống có truy cập được repo không (repo của chính họ nhưng private)
        GitHubRepoService.RepoAccess access = gitHubRepoService.checkAccess(repoUrl);
        if (access == GitHubRepoService.RepoAccess.PRIVATE_NO_ACCESS) {
            // Repo của họ nhưng private → mời bot để hệ thống pull được
            throw new AppException(ErrorCode.REPO_NEEDS_BOT);
        }

        // 3. Clone + virus scan + snapshot — token null nếu public, bot token nếu private
        String token = gitHubRepoService.getCloneToken(repoUrl);
        SourceProcessResult result;
        try {
            result = sourceProcessingClient.process(repoUrl, token, branch);
        } catch (SourceProcessingClient.SourceProcessingException e) {
            throw new AppException(ErrorCode.SOURCE_PROCESSING_FAILED);
        }

        // 3. Phát hiện mã độc → reject
        if (!result.isClean()) {
            Game gameToSave = gameRepository.findById(gameId)
                    .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
            gameToSave.setStatus(GameStatus.rejected);
            gameRepository.save(gameToSave);
            saveSnapshotForGame(gameToSave, result, false, false);
            auditLogService.publish(
                    creator.getId(), ActorRole.developer, AuditAction.security_alert,
                    AuditTarget.game, gameId, null, null,
                    "Phát hiện mã độc trong repo của game: " + gameToSave.getTitle(), null);
            try {
                notificationService.createAndSendNotification(
                        creator,
                        null,
                        NotificationType.SECURITY_ALERT,
                        "CẢNH BÁO BẢO MẬT: Mã nguồn / File ZIP của game \"" + gameToSave.getTitle() + "\" bị phát hiện chứa mã độc và đã bị từ chối.",
                        gameId.toString()
                );
            } catch (Exception e) {
                log.warn("Lỗi gửi thông báo SECURITY_ALERT: {}", e.getMessage());
            }
            throw new AppException(ErrorCode.SOURCE_MALWARE_DETECTED);
        }

        // 3b. Không phải Godot project hợp lệ (framework khác / repo bừa) → từ chối
        if (!result.isGodotProject()) {
            log.warn("Repo {} không phải Godot project (hasProjectGodot={}, hasGodotSource={})",
                    repoUrl, result.isHasProjectGodot(), result.isHasGodotSource());
            throw new AppException(ErrorCode.NOT_GODOT_PROJECT);
        }

        // 3c. Kiểm tra xem mã nguồn mới có gì thay đổi so với bản gần nhất không
        java.util.Optional<SourceSnapshot> latestSnapOpt = sourceSnapshotRepository.findFirstByGameIdOrderByCreatedAtDesc(gameId);
        if (latestSnapOpt.isPresent()) {
            SourceSnapshot latestSnap = latestSnapOpt.get();
            boolean isCommitSame = latestSnap.getCommitSha() != null && latestSnap.getCommitSha().equalsIgnoreCase(result.getCommitSha());
            boolean isBundleSame = latestSnap.getBundleHash() != null && latestSnap.getBundleHash().equals(result.getBundleHash());
            if (isCommitSame || isBundleSame) {
                throw new AppException(ErrorCode.SOURCE_NO_CHANGES);
            }
        }

        // 4. Sạch → reload game mới nhất từ DB và lưu repo + verified + snapshot → chuyển pending
        Game gameToSave = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
        gameToSave.setGithubRepoUrl(repoUrl);
        gameToSave.setGithubBranch(branch);
        gameToSave.setGithubVerifiedAt(java.time.Instant.now());

        boolean isUpdate = gameToSave.getStatus() == GameStatus.published
                || gameToSave.getStatus() == GameStatus.approved
                || gameToSave.getStatus() == GameStatus.awaiting_store_build;

        if (!isUpdate) {
            gameToSave.setStatus(GameStatus.pending);
        }
        gameRepository.save(gameToSave);

        SourceSnapshot sourceSnapshot = saveSnapshotForGame(gameToSave, result, true, isUpdate);
        UUID snapshotId = sourceSnapshot.getId();

        if (isUpdate) {
            gameToSave.setPendingUpdateSnapshot(sourceSnapshot);
            gameRepository.save(gameToSave);
        }

        auditLogService.publish(
                creator.getId(), ActorRole.developer, AuditAction.game_submitted,
                AuditTarget.game, gameId, isUpdate ? gameToSave.getStatus().name() : GameStatus.draft.name(), isUpdate ? gameToSave.getStatus().name() : GameStatus.pending.name(),
                isUpdate ? "Game '" + gameToSave.getTitle() + "' đã gửi bản cập nhật mới qua repo. Chờ duyệt."
                        : "Game '" + gameToSave.getTitle() + "' submit qua repo, verified & snapshot. Chờ duyệt.", null);

        // AI review async (sau snapshot sạch, trước admin) để tạo report đề xuất. Fail-soft.
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    aiReviewService.reviewGameSnapshotAsync(gameId, snapshotId);
                }
            });
        } else {
            aiReviewService.reviewGameSnapshotAsync(gameId, snapshotId);
        }
    }

    @Override
    public boolean acceptBotInvitation(String repoUrl, String creatorEmail) {
        User requester = getRequesterWithRole(creatorEmail);
        assertDeveloper(requester);
        if (repoUrl == null || repoUrl.isBlank()) {
            throw new AppException(ErrorCode.REPO_URL_REQUIRED);
        }
        return gitHubRepoService.acceptBotInvitation(repoUrl);
    }

    @Override
    public String getBotUsername() {
        return gitHubRepoService.getBotUsername();
    }

    /**
     * Tạo snapshot trước để lấy UUID, rồi lưu bundle vào path bất biến chứa UUID đó.
     * AI luôn nhận chính snapshot này thay vì clone lại đầu branch GitHub.
     */
    private SourceSnapshot saveSnapshotForGame(
            Game game, SourceProcessResult result, boolean requireBundle, boolean isUpdate) {
        SourceSnapshot snap = new SourceSnapshot();
        snap.setGame(game);
        snap.setCommitSha(result.getCommitSha());
        snap.setBundleHash(result.getBundleHash());
        snap.setGodotProject(result.isGodotProject());
        snap.setVirusClean(result.isClean());
        snap.setVirusScanned(result.isScanned());
        snap.setSecretsFound(toJson(result.getSecrets()));

        // Flush để UUID tồn tại trước khi tạo object key của bundle.
        snap = sourceSnapshotRepository.saveAndFlush(snap);
        String bundleUrl = uploadSourceBundle(result, game.getId(), snap.getId());
        if (requireBundle && (bundleUrl == null || bundleUrl.isBlank())) {
            throw new AppException(ErrorCode.SOURCE_PROCESSING_FAILED);
        }

        snap.setBundleUrl(bundleUrl);
        SourceSnapshot savedSnapshot = sourceSnapshotRepository.save(snap);

        if (bundleUrl != null && !bundleUrl.isBlank()) {
            if (!isUpdate) {
                VersionUtils.updateGameVersionFile(game, bundleUrl, gameVersionRepository);
            }
        }
        return savedSnapshot;
    }

    /**
     * Upload source bundle (base64 zip từ Python) lên storage qua StorageRouter(source_bundle).
     * @return URL bundle, hoặc null nếu không có bundle / upload lỗi.
     */
    private String uploadSourceBundle(SourceProcessResult result, UUID gameId, UUID snapshotId) {
        if (result.getBundleBase64() == null || result.getBundleBase64().isBlank()) {
            return null;
        }
        try {
            byte[] zipBytes = java.util.Base64.getDecoder().decode(result.getBundleBase64());
            String objectKey = "games/" + gameId + "/snapshots/" + snapshotId + "/source-bundle.zip";
            var file = new com.godotlaunch.backend.util.ByteArrayMultipartFile(
                    zipBytes, "file", "source-bundle.zip", "application/zip");
            return seaweedFsService.uploadWithKey(file, objectKey);
        } catch (Exception e) {
            log.warn("Không upload được source bundle cho snapshot {}: {}", snapshotId, e.getMessage());
            throw new AppException(ErrorCode.SOURCE_PROCESSING_FAILED);
        }
    }

    private String toJson(Object obj) {
        try {
            return obj == null ? null : objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return null;
        }
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
        return getAllGames(null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GameResponse> getAllGames(GameStatus status, String search) {
        if (search != null && !search.isBlank()) {
            return gameRepository.searchGames(status, search.trim()).stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }
        if (status != null) {
            return getGamesByStatus(status);
        }
        return gameRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GameResponse> getGamesByStatus(GameStatus status) {
        if (status == GameStatus.pending) {
            return gameRepository.findPendingGamesAndUpdates().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }
        return gameRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GameResponse updateGame(UUID gameId, UpdateGameRequest request, String updaterEmail) {
        User updater = getRequesterWithRole(updaterEmail);
        assertDeveloper(updater);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        assertGameOwner(game, updater);
        validateUpdateDependency(game, null);

        boolean isLive = game.getStatus() == GameStatus.published
                || game.getStatus() == GameStatus.approved
                || game.getStatus() == GameStatus.awaiting_store_build;

        if (isLive) {
            if (request.getPriceProposed() != null && game.getPriceProposed() != null
                    && request.getPriceProposed().compareTo(game.getPriceProposed()) != 0) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Không thể thay đổi giá bán khi game đã được duyệt.");
            }
            if (request.getCategoryId() != null && (game.getCategory() == null || !request.getCategoryId().equals(game.getCategory().getId()))) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Không thể thay đổi danh mục khi game đã được duyệt.");
            }

            SourceSnapshot snap = game.getPendingUpdateSnapshot();
            if (request.getTitle() != null) {
                snap.setPendingTitle(request.getTitle());
            }
            if (request.getDescription() != null) {
                snap.setPendingDescription(request.getDescription());
            }
            sourceSnapshotRepository.save(snap);
        } else {
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
                game.setSourceListed(request.getPublishingType() == com.godotlaunch.backend.entity.enums.PublishingType.marketplace_listing);
            }
            game = gameRepository.save(game);
        }

        auditLogService.publishAuto(
                AuditAction.game_updated,
                AuditTarget.game,
                gameId,
                null,
                null,
                "Game '" + game.getTitle() + "' update draft/info updated by creator."
        );

        return mapToResponse(game);
    }

    @Override
    @Transactional
    public void clearGameMedia(UUID gameId, String mediaType, String updaterEmail) {
        User updater = getRequesterWithRole(updaterEmail);
        assertDeveloper(updater);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        assertGameOwner(game, updater);
        validateUpdateDependency(game, null);

        // Chuẩn hóa: "screenshot" → "image" (DB lưu mediaType là "image")
        String normalized = "video".equalsIgnoreCase(mediaType) ? "video" : "image";
        deleteMediaFilesAndRecords(gameId, normalized);
    }

    @Override
    @Transactional
    public void deleteGameMediaByUrl(UUID gameId, String mediaUrl, String updaterEmail) {
        User updater = getRequesterWithRole(updaterEmail);
        assertDeveloper(updater);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        assertGameOwner(game, updater);
        validateUpdateDependency(game, null);

        // Frontend gửi presigned URL — match bằng objectKey (bỏ query string ?X-Amz-...)
        String targetKey = extractObjectKeyFromUrl(mediaUrl);
        if (targetKey == null) {
            throw new IllegalArgumentException("Không xác định được objectKey từ mediaUrl");
        }

        boolean isLive = game.getStatus() == GameStatus.published
                || game.getStatus() == GameStatus.approved
                || game.getStatus() == GameStatus.awaiting_store_build;

        if (isLive) {
            SourceSnapshot snap = game.getPendingUpdateSnapshot();
            // Check if deleting a live video
            boolean isLiveVideo = gameMedia(gameId).stream()
                    .anyMatch(m -> "video".equalsIgnoreCase(m.getMediaType()) && targetKey.equals(extractObjectKeyFromUrl(m.getMediaUrl())));
            if (isLiveVideo) {
                snap.setPendingVideoUrl("DELETE_VIDEO");
                sourceSnapshotRepository.save(snap);
                return;
            }

            // If they are deleting the pending video
            if (snap.getPendingVideoUrl() != null && targetKey.equals(extractObjectKeyFromUrl(snap.getPendingVideoUrl()))) {
                snap.setPendingVideoUrl(null);
                sourceSnapshotRepository.save(snap);
                try {
                    seaweedFsService.deleteObject(targetKey);
                } catch (Exception e) {
                    log.warn("Lỗi khi xóa pending video khỏi storage: {}", targetKey, e);
                }
                return;
            }

            // Or if they are deleting a screenshot
            if (snap.getPendingScreenshots() != null) {
                try {
                    List<String> parsed = objectMapper.readValue(snap.getPendingScreenshots(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                    if (parsed != null) {
                        boolean removed = false;
                        for (int i = 0; i < parsed.size(); i++) {
                            if (targetKey.equals(extractObjectKeyFromUrl(parsed.get(i)))) {
                                parsed.remove(i);
                                removed = true;
                                // If it was uploaded during this pending update (i.e. it is not in live screenshots), we can delete it from storage immediately
                                boolean isNewUpload = getLiveScreenshots(gameId).stream()
                                        .noneMatch(url -> targetKey.equals(extractObjectKeyFromUrl(url)));
                                if (isNewUpload) {
                                    try {
                                        seaweedFsService.deleteObject(targetKey);
                                    } catch (Exception e) {
                                        log.warn("Lỗi khi xóa pending screenshot mới khỏi storage: {}", targetKey, e);
                                    }
                                }
                                break;
                            }
                        }
                        if (removed) {
                            snap.setPendingScreenshots(objectMapper.writeValueAsString(parsed));
                            sourceSnapshotRepository.save(snap);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Lỗi khi xóa pending screenshot: {}", e.getMessage());
                }
            } else {
                // If pendingScreenshots is null, it means they haven't modified screenshots yet.
                // We initialize it from live, remove this item, and save it.
                List<String> live = new java.util.ArrayList<>(getLiveScreenshots(gameId));
                boolean removed = false;
                for (int i = 0; i < live.size(); i++) {
                    if (targetKey.equals(extractObjectKeyFromUrl(live.get(i)))) {
                        live.remove(i);
                        removed = true;
                        break;
                    }
                }
                if (removed) {
                    try {
                        snap.setPendingScreenshots(objectMapper.writeValueAsString(live));
                        sourceSnapshotRepository.save(snap);
                    } catch (Exception e) {
                        log.warn("Lỗi khi ghi pendingScreenshots khởi tạo: {}", e.getMessage());
                    }
                }
            }
        } else {
            gameMedia(gameId).stream()
                    .filter(m -> targetKey.equals(extractObjectKeyFromUrl(m.getMediaUrl())))
                    .findFirst()
                    .ifPresent(m -> {
                        mediaRepository.delete(m);
                        try {
                            seaweedFsService.deleteObject(targetKey);
                        } catch (Exception e) {
                            log.warn("Đã xóa record media nhưng không xóa được file storage: {}", targetKey, e);
                        }
                    });
        }
    }

    private String getPresignedGetUrl(String rawUrl) {
        return seaweedFsService.resolvePublicUrl(rawUrl);
    }

    /**
     * Web demo (html/js/wasm/pck) phải load qua proxy backend (không phải thẳng URL SeaweedFS) để:
     * (1) gắn được header Cross-Origin-Isolation (COOP/COEP) cho Godot Web export dùng Threads,
     * (2) bắt buộc đăng nhập mới chơi được (endpoint /web-demo/** yêu cầu auth, xem SecurityConfig).
     */
    private String getWebDemoProxyUrl(UUID gameId, String rawWebDemoUrl) {
        if (rawWebDemoUrl == null || rawWebDemoUrl.isBlank()) {
            return null;
        }
        String key = extractObjectKeyFromUrl(rawWebDemoUrl);
        String marker = "/web_demo/";
        int idx = key == null ? -1 : key.indexOf(marker);
        if (idx == -1) {
            return null;
        }
        String relativePath = key.substring(idx + marker.length());
        return backendUrl + "/api/v1/games/" + gameId + "/web-demo/" + relativePath;
    }

    private GameResponse mapToResponse(Game game) {
        List<Media> mediaList = gameMedia(game.getId());
        List<String> screenshots = mediaList.stream()
                .filter(m -> "image".equalsIgnoreCase(m.getMediaType()) || "screenshot".equalsIgnoreCase(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl()))
                .collect(Collectors.toList());
        String videoUrl = mediaList.stream()
                .filter(m -> "video".equalsIgnoreCase(m.getMediaType()))
                .map(m -> getPresignedGetUrl(m.getMediaUrl()))
                .findFirst()
                .orElse(null);

        // File source game (bản phát hành hoạt động) lấy từ GameVersion hiện tại.
        String fileUrl = null;
        String versionNumber = "1.0.0";
        java.util.Optional<GameVersion> currentVerOpt = gameVersionRepository.findByGame_IdAndIsCurrentTrue(game.getId());
        if (currentVerOpt.isPresent()) {
            versionNumber = currentVerOpt.get().getVersionNumber();
            fileUrl = currentVerOpt.get().getFileUrl();
        }

        // Bản cập nhật chờ duyệt (nếu có)
        UUID pendingUpdateSnapshotId = null;
        String pendingUpdateFileUrl = null;
        String pendingTitle = null;
        String pendingDescription = null;
        String pendingThumbnailUrl = null;
        String pendingVideoUrl = null;
        List<String> pendingScreenshots = null;

        if (game.getPendingUpdateSnapshot() != null) {
            SourceSnapshot snap = game.getPendingUpdateSnapshot();
            pendingUpdateSnapshotId = snap.getId();
            pendingUpdateFileUrl = getPresignedGetUrl(snap.getBundleUrl());
            pendingTitle = snap.getPendingTitle();
            pendingDescription = snap.getPendingDescription();
            pendingThumbnailUrl = snap.getPendingThumbnailUrl() != null ? getPresignedGetUrl(snap.getPendingThumbnailUrl()) : null;
            pendingVideoUrl = snap.getPendingVideoUrl() != null ? getPresignedGetUrl(snap.getPendingVideoUrl()) : null;

            if (snap.getPendingScreenshots() != null) {
                try {
                    List<String> rawUrls = objectMapper.readValue(snap.getPendingScreenshots(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                    if (rawUrls != null) {
                        pendingScreenshots = rawUrls.stream()
                                .map(this::getPresignedGetUrl)
                                .collect(Collectors.toList());
                    }
                } catch (Exception e) {
                    log.warn("Lỗi khi đọc pending_screenshots từ snapshot {}: {}", snap.getId(), e.getMessage());
                }
            }
        }

        return GameResponse.builder()
                .id(game.getId())
                .title(game.getTitle())
                .description(game.getDescription())
                .thumbnailUrl(getPresignedGetUrl(game.getThumbnailUrl()))
                .priceProposed(game.getPriceProposed())
                .downloadPrice(null)
                .communityAvailable(game.isSourceListed())
                .status(game.getStatus().name())
                .uploadStatus(game.getUploadStatus())
                .uploadError(game.getUploadError())
                .creatorName(game.getCreator().getEmail())
                .creatorFullName(game.getCreator().getFullName())
                .categoryName(game.getCategory() != null ? game.getCategory().getName() : null)
                .publishingType(game.getPublishingType() != null ? game.getPublishingType().name() : null)
                .screenshots(screenshots)
                .videoUrl(videoUrl)
                .fileUrl(getPresignedGetUrl(fileUrl))
                .webDemoUrl(getWebDemoProxyUrl(game.getId(), game.getWebDemoUrl()))
                .version(versionNumber)
                .tags(game.getTags() == null ? java.util.List.of() : game.getTags().stream().map(com.godotlaunch.backend.utils.TranslationUtils::resolveTagName).toList())
                .githubRepoUrl(game.getGithubRepoUrl())
                .githubBranch(game.getGithubBranch())
                .pendingUpdateSnapshotId(pendingUpdateSnapshotId)
                .pendingUpdateFileUrl(pendingUpdateFileUrl)
                .pendingTitle(pendingTitle)
                .pendingDescription(pendingDescription)
                .pendingThumbnailUrl(pendingThumbnailUrl)
                .pendingVideoUrl(pendingVideoUrl)
                .pendingScreenshots(pendingScreenshots)
                .createdAt(game.getCreatedAt())
                .updatedAt(game.getUpdatedAt())
                .build();
    }


    @Override
    @Transactional(readOnly = true)
    public String getPresignedUploadUrl(UUID gameId, String fileType, String contentType, String requesterEmail) {
        User requester = getRequesterWithRole(requesterEmail);
        assertDeveloper(requester);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
        assertGameOwner(game, requester);
        validateUpdateDependency(game, fileType);

        // thumbnail/video: key random mỗi lần upload để tránh browser cache ảnh/video cũ khi thay file mới
        String objectKey;
        if ("thumbnail".equalsIgnoreCase(fileType)) {
            objectKey = "games/" + gameId.toString() + "/thumbnail_" + UUID.randomUUID().toString();
        } else if ("screenshot".equalsIgnoreCase(fileType) || "image".equalsIgnoreCase(fileType)) {
            objectKey = "games/" + gameId.toString() + "/screenshots/" + UUID.randomUUID().toString();
        } else if ("video".equalsIgnoreCase(fileType)) {
            objectKey = "games/" + gameId.toString() + "/video_" + UUID.randomUUID().toString();
        } else {
            objectKey = "games/" + gameId.toString() + "/game.zip";
        }

        return seaweedFsService.generatePresignedUploadUrl(objectKey, contentType);
    }

    @Override
    @Transactional
    public void confirmUploadComplete(UUID gameId, String fileType, String objectKey, String requesterEmail) {
        User requester = getRequesterWithRole(requesterEmail);
        assertDeveloper(requester);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
        assertGameOwner(game, requester);
        validateUpdateDependency(game, fileType);

        boolean isLive = game.getStatus() == GameStatus.published
                || game.getStatus() == GameStatus.approved
                || game.getStatus() == GameStatus.awaiting_store_build;

        if ("thumbnail".equalsIgnoreCase(fileType)) {
            if (objectKey == null) {
                throw new IllegalArgumentException("objectKey is required to confirm thumbnail upload");
            }
            String mediaUrl = seaweedFsService.getFileUrl(objectKey);
            if (isLive) {
                SourceSnapshot snap = game.getPendingUpdateSnapshot();
                String oldKey = extractObjectKeyFromUrl(snap.getPendingThumbnailUrl());
                snap.setPendingThumbnailUrl(mediaUrl);
                sourceSnapshotRepository.save(snap);
                if (oldKey != null && !oldKey.equals(objectKey)) {
                    try {
                        seaweedFsService.deleteObject(oldKey);
                    } catch (Exception e) {
                        log.warn("Không xóa được pending thumbnail cũ: {}", oldKey, e);
                    }
                }
            } else {
                String oldKey = extractObjectKeyFromUrl(game.getThumbnailUrl());
                String thumbnailUrl = seaweedFsService.getFileUrl(objectKey);
                game.setThumbnailUrl(thumbnailUrl);
                gameRepository.save(game);
                if (oldKey != null && !oldKey.equals(objectKey)) {
                    try {
                        seaweedFsService.deleteObject(oldKey);
                    } catch (Exception e) {
                        log.warn("Không xóa được thumbnail cũ trên storage: {}", oldKey, e);
                    }
                }
            }
        } else if ("screenshot".equalsIgnoreCase(fileType) || "image".equalsIgnoreCase(fileType) || "video".equalsIgnoreCase(fileType)) {
            if (objectKey == null) {
                throw new IllegalArgumentException("objectKey is required to confirm media uploads (screenshots or videos)");
            }
            String mediaUrl = seaweedFsService.getFileUrl(objectKey);
            boolean isVideo = "video".equalsIgnoreCase(fileType);

            if (isLive) {
                SourceSnapshot snap = game.getPendingUpdateSnapshot();
                if (isVideo) {
                    String oldKey = extractObjectKeyFromUrl(snap.getPendingVideoUrl());
                    snap.setPendingVideoUrl(mediaUrl);
                    sourceSnapshotRepository.save(snap);
                    if (oldKey != null && !oldKey.equals(objectKey)) {
                        try {
                            seaweedFsService.deleteObject(oldKey);
                        } catch (Exception e) {
                            log.warn("Không xóa được pending video cũ: {}", oldKey, e);
                        }
                    }
                } else {
                    List<String> list = new java.util.ArrayList<>();
                    if (snap.getPendingScreenshots() != null) {
                        try {
                            List<String> parsed = objectMapper.readValue(snap.getPendingScreenshots(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                            if (parsed != null) {
                                list.addAll(parsed);
                            }
                        } catch (Exception e) {
                            log.warn("Lỗi đọc pendingScreenshots: {}", e.getMessage());
                        }
                    } else {
                        list.addAll(getLiveScreenshots(gameId));
                    }
                    list.add(mediaUrl);
                    try {
                        snap.setPendingScreenshots(objectMapper.writeValueAsString(list));
                    } catch (Exception e) {
                        log.warn("Lỗi ghi pendingScreenshots: {}", e.getMessage());
                    }
                    sourceSnapshotRepository.save(snap);
                }
            } else {
                // Video chỉ có 1 cái/game → upload mới thay thế cái cũ (không giữ lịch sử).
                if (isVideo) {
                    mediaRepository.deleteByGame_IdAndMediaType(gameId, "video");
                }

                Media media = new Media();
                media.setGame(game);
                media.setMediaType(isVideo ? "video" : "image");
                media.setMediaUrl(mediaUrl);
                mediaRepository.save(media);
            }
        } else {
            // Luồng upload game.zip trực tiếp: chỉ quét virus (file source thật của game đi qua repo + snapshot,
            // không lưu file_url rời trên Game nữa).
            String actualKey = objectKey != null ? objectKey : "games/" + gameId.toString() + "/game.zip";
            asyncVirusScanService.scanAndProcessGame(gameId, actualKey);
        }
    }

    @Override
    @Transactional
    public String uploadGameMedia(UUID gameId, String fileType, MultipartFile file, String uploaderEmail) {
        User uploader = getRequesterWithRole(uploaderEmail);
        assertDeveloper(uploader);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        assertGameOwner(game, uploader);
        validateUpdateDependency(game, fileType);

        validateMediaFileSize(fileType, file);

        String objectKey = buildMediaObjectKey(gameId, fileType, file);

        // Upload qua SeaweedFsService
        String mediaUrl = seaweedFsService.uploadWithKey(file, objectKey);

        boolean isLive = game.getStatus() == GameStatus.published
                || game.getStatus() == GameStatus.approved
                || game.getStatus() == GameStatus.awaiting_store_build;

        if ("thumbnail".equalsIgnoreCase(fileType)) {
            if (isLive) {
                SourceSnapshot snap = game.getPendingUpdateSnapshot();
                String oldKey = extractObjectKeyFromUrl(snap.getPendingThumbnailUrl());
                snap.setPendingThumbnailUrl(mediaUrl);
                sourceSnapshotRepository.save(snap);
                if (oldKey != null && !oldKey.equals(objectKey)) {
                    try {
                        seaweedFsService.deleteObject(oldKey);
                    } catch (Exception e) {
                        log.warn("Không xóa được pending thumbnail cũ: {}", oldKey, e);
                    }
                }
            } else {
                // Xóa ảnh thumbnail cũ trên storage (key random mỗi lần nên không tự động bị ghi đè)
                String oldKey = extractObjectKeyFromUrl(game.getThumbnailUrl());
                game.setThumbnailUrl(mediaUrl);
                gameRepository.save(game);
                if (oldKey != null && !oldKey.equals(objectKey)) {
                    try {
                        seaweedFsService.deleteObject(oldKey);
                    } catch (Exception e) {
                        log.warn("Không xóa được thumbnail cũ trên storage: {}", oldKey, e);
                    }
                }
            }
        } else {
            boolean isVideo = "video".equalsIgnoreCase(fileType);
            if (isLive) {
                SourceSnapshot snap = game.getPendingUpdateSnapshot();
                if (isVideo) {
                    String oldKey = extractObjectKeyFromUrl(snap.getPendingVideoUrl());
                    snap.setPendingVideoUrl(mediaUrl);
                    sourceSnapshotRepository.save(snap);
                    if (oldKey != null && !oldKey.equals(objectKey)) {
                        try {
                            seaweedFsService.deleteObject(oldKey);
                        } catch (Exception e) {
                            log.warn("Không xóa được pending video cũ: {}", oldKey, e);
                        }
                    }
                } else {
                    List<String> list = new java.util.ArrayList<>();
                    if (snap.getPendingScreenshots() != null) {
                        try {
                            List<String> parsed = objectMapper.readValue(snap.getPendingScreenshots(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                            if (parsed != null) {
                                list.addAll(parsed);
                            }
                        } catch (Exception e) {
                            log.warn("Lỗi đọc pendingScreenshots: {}", e.getMessage());
                        }
                    } else {
                        list.addAll(getLiveScreenshots(gameId));
                    }
                    list.add(mediaUrl);
                    try {
                        snap.setPendingScreenshots(objectMapper.writeValueAsString(list));
                    } catch (Exception e) {
                        log.warn("Lỗi ghi pendingScreenshots: {}", e.getMessage());
                    }
                    sourceSnapshotRepository.save(snap);
                }
            } else {
                // Video chỉ 1 cái/game → thay thế cái cũ
                if (isVideo) {
                    deleteMediaFilesAndRecords(gameId, "video");
                }
                Media media = new Media();
                media.setGame(game);
                media.setMediaType(isVideo ? "video" : "image");
                media.setMediaUrl(mediaUrl);
                mediaRepository.save(media);
            }
        }

        return objectKey;
    }

    /** Xóa cả file storage (đúng provider) lẫn record DB cho 1 loại media. */
    private void deleteMediaFilesAndRecords(UUID gameId, String mediaType) {
        gameMedia(gameId).stream()
                .filter(m -> mediaType.equalsIgnoreCase(m.getMediaType()))
                .forEach(m -> {
                    String key = extractObjectKeyFromUrl(m.getMediaUrl());
                    if (key != null) {
                        try {
                            seaweedFsService.deleteObject(key);
                        } catch (Exception e) {
                            log.warn("Không xóa được file media trên storage: {}", key, e);
                        }
                    }
                });
        mediaRepository.deleteByGame_IdAndMediaType(gameId, mediaType);
    }

    @Override
    @Transactional
    public void approveGame(UUID gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if (game.getPendingUpdateSnapshot() != null) {
            SourceSnapshot pendingSnapshot = game.getPendingUpdateSnapshot();

            // 1. Merge metadata
            if (pendingSnapshot.getPendingTitle() != null) {
                game.setTitle(pendingSnapshot.getPendingTitle());
            }
            if (pendingSnapshot.getPendingDescription() != null) {
                game.setDescription(pendingSnapshot.getPendingDescription());
            }

            // 2. Merge thumbnail
            if (pendingSnapshot.getPendingThumbnailUrl() != null) {
                String oldThumbnailUrl = game.getThumbnailUrl();
                game.setThumbnailUrl(pendingSnapshot.getPendingThumbnailUrl());
                if (oldThumbnailUrl != null) {
                    String oldKey = extractObjectKeyFromUrl(oldThumbnailUrl);
                    if (oldKey != null) {
                        try {
                            seaweedFsService.deleteObject(oldKey);
                        } catch (Exception e) {
                            log.warn("Không xóa được thumbnail cũ khi duyệt cập nhật: {}", oldKey, e);
                        }
                    }
                }
            }

            // 3. Merge video
            if (pendingSnapshot.getPendingVideoUrl() != null) {
                if ("DELETE_VIDEO".equals(pendingSnapshot.getPendingVideoUrl())) {
                    deleteMediaFilesAndRecords(game.getId(), "video");
                } else {
                    deleteMediaFilesAndRecords(game.getId(), "video");
                    Media videoMedia = new Media();
                    videoMedia.setGame(game);
                    videoMedia.setMediaType("video");
                    videoMedia.setMediaUrl(pendingSnapshot.getPendingVideoUrl());
                    mediaRepository.save(videoMedia);
                }
            }

            // 4. Merge screenshots
            if (pendingSnapshot.getPendingScreenshots() != null) {
                try {
                    List<String> newScreenshots = objectMapper.readValue(pendingSnapshot.getPendingScreenshots(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                    if (newScreenshots != null) {
                        List<Media> currentMedia = mediaRepository.findByGame_IdOrderByCreatedAtDesc(game.getId());
                        List<Media> liveScreenshots = currentMedia.stream()
                                .filter(m -> "image".equalsIgnoreCase(m.getMediaType()) || "screenshot".equalsIgnoreCase(m.getMediaType()))
                                .collect(Collectors.toList());

                        // Delete screenshots that are no longer present
                        for (Media media : liveScreenshots) {
                            boolean stillExists = newScreenshots.stream()
                                    .anyMatch(url -> extractObjectKeyFromUrl(url).equals(extractObjectKeyFromUrl(media.getMediaUrl())));
                            if (!stillExists) {
                                mediaRepository.delete(media);
                                String key = extractObjectKeyFromUrl(media.getMediaUrl());
                                if (key != null) {
                                    try {
                                        seaweedFsService.deleteObject(key);
                                    } catch (Exception e) {
                                        log.warn("Không xóa được screenshot cũ khỏi storage: {}", key, e);
                                    }
                                }
                            }
                        }

                        // Add new screenshots
                        for (String url : newScreenshots) {
                            boolean alreadyExists = liveScreenshots.stream()
                                    .anyMatch(m -> extractObjectKeyFromUrl(m.getMediaUrl()).equals(extractObjectKeyFromUrl(url)));
                            if (!alreadyExists) {
                                Media media = new Media();
                                media.setGame(game);
                                media.setMediaType("image");
                                media.setMediaUrl(url);
                                mediaRepository.save(media);
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Lỗi khi đồng bộ screenshots lúc duyệt game cập nhật: {}", e.getMessage());
                }
            }

            VersionUtils.updateGameVersionFile(game, pendingSnapshot.getBundleUrl(), gameVersionRepository);

            game.setPendingUpdateSnapshot(null);

            if (game.getPublishingType() != null && game.getPublishingType() != com.godotlaunch.backend.entity.enums.PublishingType.marketplace_listing) {
                game.setStatus(GameStatus.awaiting_store_build);
            }
            gameRepository.save(game);

            emailService.sendGameStatusNotification(
                    game.getCreator().getEmail(),
                    game.getTitle(),
                    "UPDATE APPROVED",
                    "Your game update has been approved and is now live."
            );

            auditLogService.publishAuto(
                    AuditAction.game_published,
                    AuditTarget.game,
                    game.getId(),
                    null,
                    game.getStatus().name(),
                    "Bản cập nhật của game '" + game.getTitle() + "' đã được admin duyệt và phát hành."
            );

            notificationService.createAndSendNotification(
                    game.getCreator(),
                    null,
                    NotificationType.GAME_REVIEW_RESULT,
                    "Bản cập nhật dự án game \"" + game.getTitle() + "\" của bạn đã được quản trị viên phê duyệt thành công!",
                    game.getId().toString()
            );

            markLatestPlagiarismFlagsReviewed(gameId);
            return;
        }

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

        notificationService.createAndSendNotification(
                game.getCreator(),
                null,
                NotificationType.GAME_REVIEW_RESULT,
                "Dự án game \"" + game.getTitle() + "\" của bạn đã được quản trị viên phê duyệt thành công!",
                game.getId().toString()
        );

        markLatestPlagiarismFlagsReviewed(gameId);
    }

    @Override
    @Transactional
    public void rejectGame(UUID gameId, String reason) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if (game.getPendingUpdateSnapshot() != null) {
            SourceSnapshot pendingSnapshot = game.getPendingUpdateSnapshot();
            try {
                String key = extractObjectKeyFromUrl(pendingSnapshot.getBundleUrl());
                if (key != null) {
                    seaweedFsService.deleteObject(key);
                }
            } catch (Exception e) {
                log.warn("Không xóa được file bundle của snapshot bị từ chối: {}", pendingSnapshot.getId(), e);
            }

            // Delete pending thumbnail if exists
            if (pendingSnapshot.getPendingThumbnailUrl() != null) {
                String key = extractObjectKeyFromUrl(pendingSnapshot.getPendingThumbnailUrl());
                if (key != null) {
                    try {
                        seaweedFsService.deleteObject(key);
                    } catch (Exception e) {
                        log.warn("Không xóa được pending thumbnail khi từ chối: {}", key, e);
                    }
                }
            }

            // Delete pending video if exists
            if (pendingSnapshot.getPendingVideoUrl() != null && !"DELETE_VIDEO".equals(pendingSnapshot.getPendingVideoUrl())) {
                String key = extractObjectKeyFromUrl(pendingSnapshot.getPendingVideoUrl());
                if (key != null) {
                    try {
                        seaweedFsService.deleteObject(key);
                    } catch (Exception e) {
                        log.warn("Không xóa được pending video khi từ chối: {}", key, e);
                    }
                }
            }

            // Delete pending screenshots (only those that are NOT live screenshots)
            if (pendingSnapshot.getPendingScreenshots() != null) {
                try {
                    List<String> pendingUrls = objectMapper.readValue(pendingSnapshot.getPendingScreenshots(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                    if (pendingUrls != null) {
                        List<String> liveUrls = getLiveScreenshots(gameId);
                        for (String url : pendingUrls) {
                            boolean isLiveScreenshot = liveUrls.stream()
                                    .anyMatch(liveUrl -> extractObjectKeyFromUrl(liveUrl).equals(extractObjectKeyFromUrl(url)));
                            if (!isLiveScreenshot) {
                                String key = extractObjectKeyFromUrl(url);
                                if (key != null) {
                                    try {
                                        seaweedFsService.deleteObject(key);
                                    } catch (Exception e) {
                                        log.warn("Không xóa được pending screenshot khi từ chối: {}", key, e);
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Lỗi khi giải phóng pending screenshots khi từ chối: {}", e.getMessage());
                }
            }

            game.setPendingUpdateSnapshot(null);
            gameRepository.save(game);

            emailService.sendGameStatusNotification(
                    game.getCreator().getEmail(),
                    game.getTitle(),
                    "UPDATE REJECTED",
                    "Your game update has been rejected. Reason: " + reason
            );

            auditLogService.publishAuto(
                    AuditAction.game_rejected,
                    AuditTarget.game,
                    game.getId(),
                    null,
                    game.getStatus().name(),
                    "Bản cập nhật của game '" + game.getTitle() + "' đã bị admin từ chối. Lý do: " + reason
            );

            notificationService.createAndSendNotification(
                    game.getCreator(),
                    null,
                    NotificationType.GAME_REVIEW_RESULT,
                    "Bản cập nhật dự án game \"" + game.getTitle() + "\" của bạn đã bị từ chối xét duyệt." + (reason != null && !reason.isBlank() ? " Lý do: " + reason : ""),
                    game.getId().toString()
            );

            markLatestPlagiarismFlagsReviewed(gameId);
            return;
        }

        if (game.getStatus() != GameStatus.pending) {
            throw new IllegalStateException("Game must be in pending status to be rejected");
        }

        game.setStatus(GameStatus.rejected);

        // Xóa các tệp ZIP, Thumbnail và tất cả Screenshots/Videos trên SeaweedFS để giải phóng dung lượng khi bị từ chối
        try {
            String zipKey = "games/" + gameId.toString() + "/game.zip";
            seaweedFsService.deleteObject(zipKey);

            // Key thumbnail là random (UUID) nên phải lấy từ URL đã lưu, không đoán được đường dẫn cố định
            String thumbnailKey = extractObjectKeyFromUrl(game.getThumbnailUrl());
            if (thumbnailKey != null) {
                seaweedFsService.deleteObject(thumbnailKey);
            }

            game.setThumbnailUrl(null);

            // Xóa toàn bộ screenshots và videos trong media
            List<Media> mediaList = gameMedia(gameId);
            for (Media media : mediaList) {
                String mediaKey = extractObjectKeyFromUrl(media.getMediaUrl());
                if (mediaKey != null) {
                    seaweedFsService.deleteObject(mediaKey);
                }
            }
            mediaRepository.deleteByGame_Id(gameId);
            log.info("Đã xóa tệp ZIP, Thumbnail và {} tệp screenshots/video trên storage cho game bị từ chối: gameId = {}", mediaList.size(), gameId);
        } catch (Exception e) {
            log.warn("Không thể xóa hoàn toàn tệp tin trên storage của game bị từ chối: gameId = {}, lỗi = {}", gameId, e.getMessage());
        }

        gameRepository.save(game);
        markLatestPlagiarismFlagsReviewed(gameId);

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

        notificationService.createAndSendNotification(
                game.getCreator(),
                null,
                NotificationType.GAME_REVIEW_RESULT,
                "Dự án game \"" + game.getTitle() + "\" của bạn đã bị từ chối xét duyệt." + (reason != null && !reason.isBlank() ? " Lý do: " + reason : ""),
                game.getId().toString()
        );
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

    private void markLatestPlagiarismFlagsReviewed(UUID gameId) {
        sourceSnapshotRepository.findFirstByGameIdOrderByCreatedAtDesc(gameId)
                .ifPresent(snapshot -> plagiarismFlagRepository.markReviewedBySnapshotId(snapshot.getId()));
    }

    @Override
    @Transactional
    public void uploadWebDemo(UUID gameId, MultipartFile file, String creatorEmail) {
        User creator = getRequesterWithRole(creatorEmail);
        assertDeveloper(creator);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        assertGameOwner(game, creator);
        validateUpdateDependency(game, "web_demo");

        // 1. Quét virus file ZIP bằng ClamAV
        try (java.io.InputStream scanStream = file.getInputStream()) {
            boolean isClean = clamAVService.scanStream(scanStream);
            if (!isClean) {
                log.warn("PHÁT HIỆN MÃ ĐỘC trong tệp tin Web Demo tải lên của gameId: {}", gameId);
                auditLogService.publishAuto(
                        AuditAction.security_alert,
                        AuditTarget.game,
                        gameId,
                        null,
                        null,
                        "PHÁT HIỆN MÃ ĐỘC trong file Web Demo zip tải lên."
                );
                throw new AppException(ErrorCode.SECURITY_CHECK_FAILED);
            }
        } catch (java.io.IOException e) {
            throw new RuntimeException("Lỗi đọc file upload để quét virus", e);
        }

        // 2. Giải nén an toàn và validate cấu trúc
        java.nio.file.Path tempDir = null;
        try {
            tempDir = java.nio.file.Files.createTempDirectory("web_demo_" + gameId.toString());
            try (java.io.InputStream zipStream = file.getInputStream()) {
                com.godotlaunch.backend.util.SafeZipUnpacker.unzipSafely(zipStream, tempDir);
            }

            // Tìm thư mục chứa file .html trong tệp ZIP đã giải nén
            java.nio.file.Path demoRoot = findDemoRoot(tempDir);
            if (demoRoot == null) {
                log.warn("Không tìm thấy thư mục chứa file .html trong tệp ZIP");
                throw new AppException(ErrorCode.INVALID_FILE_STRUCTURE, "Không tìm thấy file .html trong gói ZIP tải lên.");
            }

            // Kiểm tra cấu trúc ZIP: bắt buộc phải có đủ các file đuôi .html, .js, .wasm, .pck tại thư mục demo
            java.io.File[] files = demoRoot.toFile().listFiles();
            boolean hasHtml = false;
            boolean hasJs = false;
            boolean hasWasm = false;
            boolean hasPck = false;
            String htmlFileName = null;

            if (files != null) {
                for (java.io.File f : files) {
                    if (f.isFile()) {
                        String name = f.getName().toLowerCase();
                        if (name.endsWith(".html")) {
                            hasHtml = true;
                            htmlFileName = f.getName();
                        } else if (name.endsWith(".js")) {
                            hasJs = true;
                        } else if (name.endsWith(".wasm")) {
                            hasWasm = true;
                        } else if (name.endsWith(".pck")) {
                            hasPck = true;
                        }
                    }
                }
            }

            java.util.List<String> missing = new java.util.ArrayList<>();
            if (!hasHtml) missing.add("*.html");
            if (!hasJs) missing.add("*.js");
            if (!hasWasm) missing.add("*.wasm");
            if (!hasPck) missing.add("*.pck");

            if (!missing.isEmpty()) {
                String errorMsg = "Cấu trúc tệp tin tải lên không hợp lệ. Thiếu các tệp tin đuôi: " + String.join(", ", missing);
                log.warn("Thiếu các tệp tin bắt buộc trong ZIP: {}", missing);
                throw new AppException(ErrorCode.INVALID_FILE_STRUCTURE, errorMsg);
            }

            // 3. Upload toàn bộ các file đã giải nén đệ quy lên SeaweedFS.
            // Mỗi lần upload dùng 1 thư mục version (UUID) riêng: cho phép cache-control dài hạn (immutable) trên
            // các asset tĩnh (js/wasm/pck...) để lần chơi lại sau load tức thì từ cache trình duyệt, đồng thời
            // tránh trộn lẫn file cũ/mới khi developer thay bản demo khác (bug tương tự thumbnail đã gặp trước đó).
            String oldWebDemoUrl = game.getWebDemoUrl();
            String demoVersion = UUID.randomUUID().toString();
            String demoPrefix = "games/" + gameId.toString() + "/web_demo/" + demoVersion;
            uploadDirectoryRecursive(demoRoot.toFile(), demoRoot.toFile(), demoPrefix);

            // 4. Lưu URL của file html tìm thấy làm entry point
            String indexKey = demoPrefix + "/" + htmlFileName;
            String webDemoUrl = seaweedFsService.getFileUrl(indexKey);
            game.setWebDemoUrl(webDemoUrl);
            gameRepository.save(game);

            // 5. Xóa bản demo cũ trên storage (thư mục version cũ) để tránh rác, best-effort
            if (oldWebDemoUrl != null) {
                String oldPrefix = extractWebDemoVersionPrefix(oldWebDemoUrl);
                if (oldPrefix != null && !oldPrefix.equals(demoPrefix)) {
                    try {
                        seaweedFsService.deleteObjectRecursive(oldPrefix);
                    } catch (Exception e) {
                        log.warn("Không xóa được bản web demo cũ trên storage: {}", oldPrefix, e);
                    }
                }
            }

            log.info("Upload Web Demo thành công cho game {}: webDemoUrl = {}", gameId, webDemoUrl);

        } catch (Exception e) {
            log.error("Lỗi khi xử lý giải nén/tải lên Web Demo cho game {}", gameId, e);
            if (e instanceof AppException) {
                throw (AppException) e;
            }
            throw new RuntimeException("Lỗi xử lý Web Demo", e);
        } finally {
            // Dọn dẹp thư mục tạm
            if (tempDir != null) {
                try {
                    deleteDirectoryRecursive(tempDir.toFile());
                } catch (Exception e) {
                    log.warn("Không thể xóa thư mục tạm: {}", tempDir, e);
                }
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void streamWebDemoFile(UUID gameId, String relativePath, jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        if (relativePath == null || relativePath.isBlank() || relativePath.contains("..")) {
            response.sendError(jakarta.servlet.http.HttpServletResponse.SC_BAD_REQUEST, "Invalid path");
            return;
        }
        if (!gameRepository.existsById(gameId)) {
            response.sendError(jakarta.servlet.http.HttpServletResponse.SC_NOT_FOUND, "Game not found");
            return;
        }

        String objectKey = "games/" + gameId + "/web_demo/" + relativePath;

        // Cross-Origin-Isolation: bắt buộc để Godot Web export dùng Threads (SharedArrayBuffer) chạy đa luồng
        response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        response.setContentType(determineContentType(relativePath));
        // Spring Security mặc định set X-Frame-Options: DENY -> chặn nhúng iframe khác origin (FE :3000 -> BE :8080).
        // Trình duyệt hiện đại ưu tiên CSP frame-ancestors hơn X-Frame-Options khi cả 2 cùng có mặt trên response.
        response.setHeader("Content-Security-Policy", "frame-ancestors 'self' " + frontendUrl);

        try (java.io.InputStream is = seaweedFsService.getObjectStream(objectKey)) {
            is.transferTo(response.getOutputStream());
        } catch (Exception e) {
            log.warn("Không đọc được file web demo: gameId={}, relativePath={}", gameId, relativePath, e);
            response.reset();
            response.sendError(jakarta.servlet.http.HttpServletResponse.SC_NOT_FOUND, "Demo file not found");
        }
    }

    private void uploadDirectoryRecursive(java.io.File root, java.io.File current, String demoPrefix) throws java.io.IOException {
        java.io.File[] files = current.listFiles();
        if (files == null) return;
        for (java.io.File file : files) {
            if (file.isDirectory()) {
                uploadDirectoryRecursive(root, file, demoPrefix);
            } else {
                // Tính relative path
                String relativePath = root.toURI().relativize(file.toURI()).getPath();
                String objectKey = demoPrefix + "/" + relativePath;

                // Xác định content type
                String contentType = determineContentType(file.getName());

                // demoPrefix có UUID riêng mỗi lần upload -> an toàn để cache dài hạn, không sợ phục vụ nhầm bản cũ
                String cacheControl = "public, max-age=31536000, immutable";

                try (java.io.InputStream is = new java.io.FileInputStream(file)) {
                    seaweedFsService.uploadStream(is, objectKey, contentType, cacheControl);
                }
            }
        }
    }

    /** Từ URL entry point (.../web_demo/{version}/index.html) suy ra thư mục version để xóa khi thay demo mới. */
    private String extractWebDemoVersionPrefix(String webDemoUrl) {
        String key = extractObjectKeyFromUrl(webDemoUrl);
        if (key == null) return null;
        int lastSlash = key.lastIndexOf('/');
        return lastSlash > 0 ? key.substring(0, lastSlash) : null;
    }

    private java.nio.file.Path findDemoRoot(java.nio.file.Path startPath) {
        try (java.util.stream.Stream<java.nio.file.Path> stream = java.nio.file.Files.walk(startPath)) {
            return stream
                    .filter(java.nio.file.Files::isDirectory)
                    .filter(path -> {
                        java.io.File[] files = path.toFile().listFiles((dir, name) -> name.toLowerCase().endsWith(".html"));
                        return files != null && files.length > 0;
                    })
                    .findFirst()
                    .orElse(null);
        } catch (java.io.IOException e) {
            log.error("Lỗi khi tìm kiếm thư mục demo", e);
            return null;
        }
    }

    private String determineContentType(String fileName) {
        String name = fileName.toLowerCase();
        if (name.endsWith(".html") || name.endsWith(".htm")) return "text/html";
        if (name.endsWith(".js")) return "application/javascript";
        if (name.endsWith(".wasm")) return "application/wasm";
        if (name.endsWith(".pck")) return "application/octet-stream";
        if (name.endsWith(".css")) return "text/css";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    private void deleteDirectoryRecursive(java.io.File path) {
        java.io.File[] files = path.listFiles();
        if (files != null) {
            for (java.io.File f : files) {
                deleteDirectoryRecursive(f);
            }
        }
        path.delete();
    }

    @Override
    @Transactional
    public void startUnifiedGameUpload(UUID gameId, MultipartFile file, String uploaderEmail) {
        User uploader = getRequesterWithRole(uploaderEmail);
        assertDeveloper(uploader);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
        assertGameOwner(game, uploader);

        // Lưu file tạm ra đĩa để helper đọc chạy nền
        File tempDir = new File(System.getProperty("java.io.tmpdir"));
        File rawZipFile = new File(tempDir, "raw-game-zip-" + gameId + "-" + System.currentTimeMillis() + ".zip");
        try {
            file.transferTo(rawZipFile);
        } catch (IOException e) {
            throw new RuntimeException("Không thể lưu file ZIP tải lên tạm thời", e);
        }

        // Cập nhật trạng thái PROCESSING
        game.setUploadStatus("PROCESSING");
        game.setUploadError(null);
        gameRepository.save(game);

        // Chạy bất đồng bộ sau khi transaction commit
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    unifiedGameUploadHelper.processUnifiedGameZipAsync(gameId, rawZipFile);
                }
            });
        } else {
            unifiedGameUploadHelper.processUnifiedGameZipAsync(gameId, rawZipFile);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public GameResponse getUploadStatus(UUID gameId, String requesterEmail) {
        User requester = getRequesterWithRole(requesterEmail);
        assertDeveloper(requester);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
        assertGameOwner(game, requester);

        return mapToResponse(game);
    }

    @Override
    @Transactional
    public void reorderScreenshots(UUID gameId, List<String> orderedUrls, String requesterEmail) {
        User requester = getRequesterWithRole(requesterEmail);
        assertDeveloper(requester);
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
        assertGameOwner(game, requester);

        // 1. Lấy tất cả screenshot hiện tại
        List<Media> screenshots = mediaRepository.findByGame_IdAndMediaType(gameId, "screenshot");

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
}
