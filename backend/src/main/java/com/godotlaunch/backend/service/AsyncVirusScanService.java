package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.util.SafeZipUnpacker;
import com.godotlaunch.backend.util.VersionUtils;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.NotificationType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AsyncVirusScanService {

    private final ClamAVService clamAVService;
    private final SeaweedFsService seaweedFsService;
    private final GameRepository gameRepository;
    private final GameVersionRepository gameVersionRepository;
    private final AssetRepository assetRepository;
    private final AuditLogService auditLogService;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final com.godotlaunch.backend.repository.UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Thực hiện kiểm duyệt tệp tin ZIP tải lên từ storage bất đồng bộ (Background thread).
     * Bao gồm quét mã độc qua ClamAV, kiểm duyệt Zip Slip/Zip Bomb qua SafeZipUnpacker.
     *
     * @param gameId ID của Game
     * @param objectKey Đường dẫn đối tượng trên storage
     */
    @Async
    @Transactional
    public void scanAndProcessGame(UUID gameId, String objectKey) {
        log.info("Bắt đầu quy trình kiểm duyệt an toàn bất đồng bộ cho gameId: {}, objectKey: {}", gameId, objectKey);

        Game game = gameRepository.findById(gameId).orElse(null);
        if (game == null) {
            log.warn("Không tìm thấy Game với id {} để tiến hành quét bảo mật.", gameId);
            return;
        }

        Path tempDir = null;
        try {
            // Bước 1: Quét virus dạng Stream trực tiếp từ storage qua ClamAV daemon
            boolean isClean;
            try (InputStream inputStream = seaweedFsService.getObjectStream(objectKey)) {
                isClean = clamAVService.scanStream(inputStream);
            }

            if (!isClean) {
                log.warn("PHÁT HIỆN MÃ ĐỘC trong tệp tin tải lên của gameId: {}. Tiến hành xóa tệp và từ chối game.", gameId);
                updateGameStatus(gameId, GameStatus.rejected);
                seaweedFsService.deleteObject(objectKey);

                auditLogService.publish(
                        game.getCreator().getId(),
                        ActorRole.developer,
                        AuditAction.security_alert,
                        AuditTarget.game,
                        gameId,
                        null,
                        null,
                        "PHÁT HIỆN MÃ ĐỘC (Malware detected) trong file game.zip của game: " + game.getTitle(),
                        null
                );
                return;
            }

            log.info("Quét mã độc file nén hoàn tất: AN TOÀN cho gameId: {}", gameId);

            // Bước 2: Tải file nén về giải nén an toàn để chống Zip Bomb / Zip Slip và kiểm tra cấu trúc
            tempDir = Files.createTempDirectory("godot_scan_" + gameId.toString());
            try (InputStream inputStream = seaweedFsService.getObjectStream(objectKey)) {
                SafeZipUnpacker.unzipSafely(inputStream, tempDir);
            }

            // Bước 3: Quét đệ quy ClamAV cho TẤT CẢ các file nằm sâu trong các thư mục con
            boolean isDeepClean = scanDirectoryRecursively(tempDir);
            if (!isDeepClean) {
                log.warn("PHÁT HIỆN MÃ ĐỘC trong tệp tin ẩn sâu thuộc thư mục con của gameId: {}. Tiến hành xóa tệp và từ chối game.", gameId);
                updateGameStatus(gameId, GameStatus.rejected);
                seaweedFsService.deleteObject(objectKey);

                auditLogService.publish(
                        game.getCreator().getId(),
                        ActorRole.developer,
                        AuditAction.security_alert,
                        AuditTarget.game,
                        gameId,
                        null,
                        null,
                        "PHÁT HIỆN MÃ ĐỘC (Malware detected in subfolder file) trong tệp nén của game: " + game.getTitle(),
                        null
                );
                return;
            }

            log.info("Quét đệ quy toàn bộ thư mục giải nén hoàn tất: AN TOÀN CHO TẤT CẢ FILE CON đối với gameId: {}", gameId);
            String fileUrl = seaweedFsService.getFileUrl(objectKey);
            boolean isLive = game.getStatus() == GameStatus.published
                    || game.getStatus() == GameStatus.approved
                    || game.getStatus() == GameStatus.awaiting_store_build;

            if (isLive) {
                // Tạo hoặc cập nhật pending snapshot
                SourceSnapshot snap = game.getPendingUpdateSnapshot();
                if (snap == null) {
                    snap = new SourceSnapshot();
                    snap.setGame(game);
                    snap.setCommitSha("ZIP_UPLOAD");
                    snap.setBundleHash("ZIP_UPLOAD_HASH");
                }
                snap.setBundleUrl(fileUrl);
                snap = sourceSnapshotRepository.save(snap);

                game.setPendingUpdateSnapshot(snap);
                gameRepository.save(game);
            } else {
                updateGameStatus(gameId, GameStatus.pending);
                VersionUtils.updateGameVersionFile(game, fileUrl, gameVersionRepository);
            }

            auditLogService.publish(
                    game.getCreator().getId(),
                    ActorRole.developer,
                    AuditAction.game_submitted,
                    AuditTarget.game,
                    gameId,
                    isLive ? game.getStatus().name() : GameStatus.draft.name(),
                    isLive ? game.getStatus().name() : GameStatus.pending.name(),
                    isLive ? "Bản cập nhật game '" + game.getTitle() + "' qua tệp ZIP đã được quét bảo mật và chờ duyệt."
                            : "Game '" + game.getTitle() + "' successfully verified and submitted for review.",
                    null
            );

            try {
                org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
                java.util.List<User> admins = userRepository.findAdminsOrderByCreatedAtAsc(pageable);
                String devName = game.getCreator().getFullName() != null && !game.getCreator().getFullName().isBlank()
                        ? game.getCreator().getFullName() : game.getCreator().getEmail();
                String notifMsg = isLive
                        ? "Nhà phát triển " + devName + " vừa gửi bản cập nhật ZIP mới cho Game: \"" + game.getTitle() + "\"."
                        : "Nhà phát triển " + devName + " vừa tải lên Game ZIP mới chờ phê duyệt: \"" + game.getTitle() + "\".";
                for (User admin : admins) {
                    notificationService.createAndSendNotification(
                            admin,
                            game.getCreator(),
                            NotificationType.NEW_SUBMISSION,
                            notifMsg,
                            gameId.toString()
                    );
                }
            } catch (Exception ex) {
                log.warn("Lỗi gửi thông báo NEW_SUBMISSION tới admin khi quét ZIP game thành công: {}", ex.getMessage());
            }

        } catch (SecurityException | IllegalStateException e) {
            log.error("Tệp ZIP vi phạm quy định an toàn hệ thống (Zip Slip hoặc Zip Bomb) đối với gameId: {}: {}", gameId, e.getMessage());
            updateGameStatus(gameId, GameStatus.rejected);
            try {
                seaweedFsService.deleteObject(objectKey);
            } catch (Exception ex) {
                log.warn("Không thể xóa file độc hại trên storage: {}", objectKey, ex);
            }

            auditLogService.publish(
                    game.getCreator().getId(),
                    ActorRole.developer,
                    AuditAction.security_alert,
                    AuditTarget.game,
                    gameId,
                    null,
                    null,
                    "PHÁT HIỆN LỖI AN NINH TỆP NÉN (Zip Slip/Zip Bomb) đối với game: " + game.getTitle() + ". Chi tiết: " + e.getMessage(),
                    null
            );
        } catch (Exception e) {
            log.error("Lỗi xảy ra trong quá trình quét bảo mật gameId: {}. Chuyển sang chế độ PENDING dự phòng.", gameId, e);
            updateGameStatus(gameId, GameStatus.pending);
            auditLogService.publish(
                    game.getCreator().getId(),
                    ActorRole.developer,
                    AuditAction.game_submitted,
                    AuditTarget.game,
                    gameId,
                    GameStatus.draft.name(),
                    GameStatus.pending.name(),
                    "Game '" + game.getTitle() + "' successfully uploaded (virus scan fallback to pending: " + e.getMessage() + ")",
                    null
            );
        } finally {
            // Bước 3: Dọn dẹp thư mục tạm thời sau khi xử lý xong
            if (tempDir != null) {
                try {
                    deleteDirectoryRecursively(tempDir);
                    log.info("Đã dọn dẹp thư mục tạm thời quét an ninh của gameId: {}", gameId);
                } catch (IOException e) {
                    log.warn("Không thể dọn dẹp thư mục tạm thời: {}", tempDir, e);
                }
            }
        }
    }

    private void updateGameStatus(UUID gameId, GameStatus status) {
        try {
            gameRepository.findById(gameId).ifPresent(game -> {
                game.setStatus(status);
                gameRepository.save(game);
                log.info("Cập nhật trạng thái game {} sang {} thành công.", gameId, status);
            });
        } catch (Exception ex) {
            log.error("Không thể cập nhật trạng thái game {} sang {}", gameId, status, ex);
        }
    }

    /**
     * Thực hiện kiểm duyệt tệp tin ZIP tải lên cho Asset bất đồng bộ.
     *
     * @param itemId ID của Asset
     * @param objectKey Đường dẫn đối tượng trên storage
     */
    @Async
    @Transactional
    public void scanAndProcessAsset(UUID itemId, String objectKey) {
        log.info("Bắt đầu quy trình kiểm duyệt an toàn bất đồng bộ cho marketplace item: {}, objectKey: {}", itemId, objectKey);

        Asset item = assetRepository.findById(itemId).orElse(null);
        if (item == null) {
            log.warn("Không tìm thấy Asset với id {} để tiến hành quét bảo mật.", itemId);
            return;
        }

        // Marketplace virus scan giờ CHỈ cho asset (source_code dùng repo, scan ở Python).
        Path tempDir = null;
        try {
            // Bước 1: Quét virus dạng Stream trực tiếp từ storage qua ClamAV daemon
            boolean isClean;
            try (InputStream inputStream = seaweedFsService.getObjectStream(objectKey)) {
                isClean = clamAVService.scanStream(inputStream);
            }

            if (!isClean) {
                log.warn("PHÁT HIỆN MÃ ĐỘC trong tệp tin tải lên của marketplace item: {}. Tiến hành xóa tệp và gỡ bỏ sản phẩm.", itemId);
                updateAssetStatus(itemId, ItemStatus.removed);
                seaweedFsService.deleteObject(objectKey);

                auditLogService.publish(
                        item.getSeller().getId(),
                        ActorRole.developer,
                        AuditAction.security_alert,
                        AuditTarget.marketplace_item,
                        itemId,
                        null,
                        null,
                        "PHÁT HIỆN MÃ ĐỘC trong file tải lên của marketplace item: " + item.getTitle(),
                        null
                );
                return;
            }

            log.info("Quét mã độc file nén hoàn tất: AN TOÀN cho marketplace item: {}", itemId);

            // Bước 2: Giải nén an toàn để chống Zip Bomb / Zip Slip
            tempDir = Files.createTempDirectory("marketplace_scan_" + itemId.toString());
            try (InputStream inputStream = seaweedFsService.getObjectStream(objectKey)) {
                SafeZipUnpacker.unzipSafely(inputStream, tempDir);
            }

            // Bước 3: Quét đệ quy ClamAV cho TẤT CẢ các file nằm sâu trong các thư mục con
            boolean isDeepClean = scanDirectoryRecursively(tempDir);
            if (!isDeepClean) {
                log.warn("PHÁT HIỆN MÃ ĐỘC trong tệp tin ẩn sâu thuộc thư mục con của marketplace item: {}. Tiến hành xóa tệp và gỡ bỏ sản phẩm.", itemId);
                updateAssetStatus(itemId, ItemStatus.removed);
                seaweedFsService.deleteObject(objectKey);

                auditLogService.publish(
                        item.getSeller().getId(),
                        ActorRole.developer,
                        AuditAction.security_alert,
                        AuditTarget.marketplace_item,
                        itemId,
                        null,
                        null,
                        "PHÁT HIỆN MÃ ĐỘC (Malware detected in subfolder file) trong tệp nén của marketplace item: " + item.getTitle(),
                        null
                );
                return;
            }

            log.info("Kiểm tra đệ quy cấu trúc và tính an toàn của tệp ZIP hoàn tất cho marketplace item: {}", itemId);

            auditLogService.publish(
                    item.getSeller().getId(),
                    ActorRole.developer,
                    AuditAction.game_submitted,
                    AuditTarget.marketplace_item,
                    itemId,
                    null,
                    null,
                    "Marketplace item '" + item.getTitle() + "' successfully scanned (clean) and pending review.",
                    null
            );

            try {
                org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
                java.util.List<User> admins = userRepository.findAdminsOrderByCreatedAtAsc(pageable);
                String devName = item.getSeller().getFullName() != null && !item.getSeller().getFullName().isBlank()
                        ? item.getSeller().getFullName() : item.getSeller().getEmail();
                for (User admin : admins) {
                    notificationService.createAndSendNotification(
                            admin,
                            item.getSeller(),
                            NotificationType.NEW_SUBMISSION,
                            "Nhà phát triển " + devName + " vừa tải lên tài nguyên mới chờ phê duyệt: \"" + item.getTitle() + "\".",
                            itemId.toString()
                    );
                }
            } catch (Exception ex) {
                log.warn("Lỗi gửi thông báo NEW_SUBMISSION tới admin khi quét tệp asset thành công: {}", ex.getMessage());
            }

        } catch (SecurityException | IllegalStateException e) {
            log.error("Tệp ZIP vi phạm quy định an toàn hệ thống (Zip Slip hoặc Zip Bomb) đối với marketplace item: {}: {}", itemId, e.getMessage());
            updateAssetStatus(itemId, ItemStatus.removed);
            try {
                seaweedFsService.deleteObject(objectKey);
            } catch (Exception ex) {
                log.warn("Không thể xóa file độc hại trên storage: {}", objectKey, ex);
            }

            auditLogService.publish(
                    item.getSeller().getId(),
                    ActorRole.developer,
                    AuditAction.security_alert,
                    AuditTarget.marketplace_item,
                    itemId,
                    null,
                    null,
                    "PHÁT HIỆN LỖI AN NINH TỆP NÉN (Zip Slip/Zip Bomb) đối với marketplace item: " + item.getTitle() + ". Chi tiết: " + e.getMessage(),
                    null
            );
        } catch (Exception e) {
            log.error("Lỗi xảy ra trong quá trình quét bảo mật marketplace item: {}.", itemId, e);
        } finally {
            if (tempDir != null) {
                try {
                    deleteDirectoryRecursively(tempDir);
                    log.info("Đã dọn dẹp thư mục tạm thời quét an ninh của marketplace item: {}", itemId);
                } catch (IOException e) {
                    log.warn("Không thể dọn dẹp thư mục tạm thời: {}", tempDir, e);
                }
            }
        }
    }

    private void updateAssetStatus(UUID itemId, ItemStatus status) {
        try {
            assetRepository.findById(itemId).ifPresent(item -> {
                item.setStatus(status);
                assetRepository.save(item);
                log.info("Cập nhật trạng thái marketplace item {} sang {} thành công.", itemId, status);
            });
        } catch (Exception ex) {
            log.error("Không thể cập nhật trạng thái marketplace item {} sang {}", itemId, status, ex);
        }
    }

    private void deleteDirectoryRecursively(Path path) throws IOException {
        if (Files.isDirectory(path)) {
            try (var stream = Files.list(path)) {
                for (Path file : stream.toList()) {
                    deleteDirectoryRecursively(file);
                }
            }
        }
        Files.delete(path);
    }

    /**
     * Quét đệ quy ClamAV cho tất cả các file nằm sâu trong các thư mục con sau khi giải nén.
     *
     * @param tempDir Thư mục gốc đã giải nén
     * @return true nếu tất cả các file đều sạch, false nếu phát hiện có ít nhất 1 file chứa virus
     */
    private boolean scanDirectoryRecursively(Path tempDir) throws IOException {
        try (var stream = Files.walk(tempDir)) {
            java.util.List<Path> filesToScan = stream
                    .filter(Files::isRegularFile)
                    .toList();

            log.info("Tiến hành quét đệ quy ClamAV cho {} tệp tin giải nén...", filesToScan.size());

            for (Path filePath : filesToScan) {
                try (InputStream is = Files.newInputStream(filePath)) {
                    boolean isClean = clamAVService.scanStream(is);
                    if (!isClean) {
                        String fileName = filePath.getFileName().toString();
                        String cleanRelPath = tempDir.relativize(filePath).toString().replace('\\', '/');
                        log.warn("PHÁT HIỆN MÃ ĐỘC trong tệp tin: {} (Đường dẫn: {})", fileName, cleanRelPath);
                        return false;
                    }
                } catch (Exception e) {
                    log.error("Lỗi khi đọc/quét tệp tin con {}: {}", filePath, e.getMessage(), e);
                    throw new RuntimeException("Lỗi quét an toàn tệp tin con " + tempDir.relativize(filePath) + ": " + e.getMessage(), e);
                }
            }
            return true;
        }
    }
}
