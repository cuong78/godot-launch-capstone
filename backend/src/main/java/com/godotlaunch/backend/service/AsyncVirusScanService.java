package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.MarketplaceItem;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.MarketplaceItemRepository;
import com.godotlaunch.backend.util.SafeZipUnpacker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AsyncVirusScanService {

    private final ClamAVService clamAVService;
    private final AwsS3Service awsS3Service;
    private final GameRepository gameRepository;
    private final MarketplaceItemRepository marketplaceItemRepository;

    /**
     * Thực hiện kiểm duyệt tệp tin ZIP tải lên từ S3 bất đồng bộ (Background thread).
     * Bao gồm quét mã độc qua ClamAV, kiểm duyệt Zip Slip/Zip Bomb qua SafeZipUnpacker.
     *
     * @param gameId ID của Game
     * @param objectKey Đường dẫn đối tượng trên S3
     */
    @Async
    public void scanAndProcessGame(UUID gameId, String objectKey) {
        log.info("Bắt đầu quy trình kiểm duyệt an toàn bất đồng bộ cho gameId: {}, objectKey: {}", gameId, objectKey);

        if (!gameRepository.existsById(gameId)) {
            log.warn("Không tìm thấy Game với id {} để tiến hành quét bảo mật.", gameId);
            return;
        }

        Path tempDir = null;
        try {
            // Bước 1: Quét virus dạng Stream trực tiếp từ S3 qua ClamAV daemon
            boolean isClean;
            try (ResponseInputStream<GetObjectResponse> inputStream = awsS3Service.getObjectStream(objectKey)) {
                isClean = clamAVService.scanStream(inputStream);
            }

            if (!isClean) {
                log.warn("PHÁT HIỆN MÃ ĐỘC trong tệp tin tải lên của gameId: {}. Tiến hành xóa tệp và từ chối game.", gameId);
                updateGameStatus(gameId, GameStatus.rejected);
                awsS3Service.deleteObject(objectKey);
                return;
            }

            log.info("Quét mã độc hoàn tất: AN TOÀN cho gameId: {}", gameId);

            // Bước 2: Tải file nén về giải nén an toàn để chống Zip Bomb / Zip Slip và kiểm tra cấu trúc
            tempDir = Files.createTempDirectory("godot_scan_" + gameId.toString());
            try (ResponseInputStream<GetObjectResponse> inputStream = awsS3Service.getObjectStream(objectKey)) {
                SafeZipUnpacker.unzipSafely(inputStream, tempDir);
            }

            // Sạch và hợp lệ -> chuyển trạng thái sang PENDING để Admin duyệt thủ công
            updateGameStatus(gameId, GameStatus.pending);

        } catch (SecurityException | IllegalStateException e) {
            log.error("Tệp ZIP vi phạm quy định an toàn hệ thống (Zip Slip hoặc Zip Bomb) đối với gameId: {}: {}", gameId, e.getMessage());
            updateGameStatus(gameId, GameStatus.rejected);
            try {
                awsS3Service.deleteObject(objectKey);
            } catch (Exception ex) {
                log.warn("Không thể xóa file độc hại trên S3: {}", objectKey, ex);
            }
        } catch (Exception e) {
            log.error("Lỗi xảy ra trong quá trình quét bảo mật gameId: {}. Chuyển sang chế độ PENDING dự phòng.", gameId, e);
            updateGameStatus(gameId, GameStatus.pending);
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
     * Thực hiện kiểm duyệt tệp tin ZIP tải lên cho MarketplaceItem bất đồng bộ.
     *
     * @param itemId ID của MarketplaceItem
     * @param objectKey Đường dẫn đối tượng trên S3
     */
    @Async
    public void scanAndProcessMarketplaceItem(UUID itemId, String objectKey) {
        log.info("Bắt đầu quy trình kiểm duyệt an toàn bất đồng bộ cho marketplace item: {}, objectKey: {}", itemId, objectKey);

        if (!marketplaceItemRepository.existsById(itemId)) {
            log.warn("Không tìm thấy MarketplaceItem với id {} để tiến hành quét bảo mật.", itemId);
            return;
        }

        Path tempDir = null;
        try {
            // Bước 1: Quét virus dạng Stream trực tiếp từ S3 qua ClamAV daemon
            boolean isClean;
            try (ResponseInputStream<GetObjectResponse> inputStream = awsS3Service.getObjectStream(objectKey)) {
                isClean = clamAVService.scanStream(inputStream);
            }

            if (!isClean) {
                log.warn("PHÁT HIỆN MÃ ĐỘC trong tệp tin tải lên của marketplace item: {}. Tiến hành xóa tệp và gỡ bỏ sản phẩm.", itemId);
                updateMarketplaceItemStatus(itemId, ItemStatus.removed);
                awsS3Service.deleteObject(objectKey);
                return;
            }

            log.info("Quét mã độc hoàn tất: AN TOÀN cho marketplace item: {}", itemId);

            // Bước 2: Tải file nén về giải nén an toàn để chống Zip Bomb / Zip Slip
            tempDir = Files.createTempDirectory("marketplace_scan_" + itemId.toString());
            try (ResponseInputStream<GetObjectResponse> inputStream = awsS3Service.getObjectStream(objectKey)) {
                SafeZipUnpacker.unzipSafely(inputStream, tempDir);
            }

            log.info("Kiểm tra cấu trúc và tính an toàn của tệp ZIP hoàn tất cho marketplace item: {}", itemId);

        } catch (SecurityException | IllegalStateException e) {
            log.error("Tệp ZIP vi phạm quy định an toàn hệ thống (Zip Slip hoặc Zip Bomb) đối với marketplace item: {}: {}", itemId, e.getMessage());
            updateMarketplaceItemStatus(itemId, ItemStatus.removed);
            try {
                awsS3Service.deleteObject(objectKey);
            } catch (Exception ex) {
                log.warn("Không thể xóa file độc hại trên S3: {}", objectKey, ex);
            }
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

    private void updateMarketplaceItemStatus(UUID itemId, ItemStatus status) {
        try {
            marketplaceItemRepository.findById(itemId).ifPresent(item -> {
                item.setStatus(status);
                marketplaceItemRepository.save(item);
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
}
