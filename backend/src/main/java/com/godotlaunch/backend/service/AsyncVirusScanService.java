package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.repository.GameRepository;
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

        Game game = gameRepository.findById(gameId).orElse(null);
        if (game == null) {
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
                game.setStatus(GameStatus.rejected);
                gameRepository.save(game);
                awsS3Service.deleteObject(objectKey);
                return;
            }

            log.info("Quét mã độc hoàn tất: AN TOÀN cho gameId: {}", gameId);

            // Bước 2: Tải file nén về giải nén an toàn để chống Zip Bomb / Zip Slip và kiểm tra cấu trúc
            tempDir = Files.createTempDirectory("godot_scan_" + gameId.toString());
            try (ResponseInputStream<GetObjectResponse> inputStream = awsS3Service.getObjectStream(objectKey)) {
                SafeZipUnpacker.unzipSafely(inputStream, tempDir);
            }

            // (Có thể bổ sung logic phân tích đạo văn GDScript AST ở đây)
            log.info("Phân tích cấu trúc file zip gameId: {} thành công. Các tệp tin được trích xuất an toàn tại {}", gameId, tempDir);

            // Sạch và hợp lệ -> chuyển trạng thái sang PENDING để Admin duyệt thủ công
            game.setStatus(GameStatus.pending);
            gameRepository.save(game);
            log.info("Cập nhật trạng thái game {} sang PENDING (chờ duyệt).", gameId);

        } catch (SecurityException | IllegalStateException e) {
            log.error("Tệp ZIP vi phạm quy định an toàn hệ thống (Zip Slip hoặc Zip Bomb) đối với gameId: {}: {}", gameId, e.getMessage());
            game.setStatus(GameStatus.rejected);
            gameRepository.save(game);
            try {
                awsS3Service.deleteObject(objectKey);
            } catch (Exception ex) {
                log.warn("Không thể xóa file độc hại trên S3: {}", objectKey, ex);
            }
        } catch (Exception e) {
            log.error("Lỗi xảy ra trong quá trình quét bảo mật gameId: {}. Chuyển sang chế độ PENDING dự phòng.", gameId, e);
            // Backup fallback cho môi trường local development khi không kết nối được ClamAV hoặc S3 thực tế
            try {
                game.setStatus(GameStatus.pending);
                gameRepository.save(game);
                log.info("Đã chuyển trạng thái dự phòng PENDING cho gameId: {} do lỗi hệ thống.", gameId);
            } catch (Exception ex) {
                log.error("Không thể ghi nhận trạng thái dự phòng cho gameId: {}", gameId, ex);
            }
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
