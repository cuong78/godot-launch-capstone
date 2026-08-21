package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.service.AiReviewService;
import com.godotlaunch.backend.service.AsyncVirusScanService;
import com.godotlaunch.backend.service.SeaweedFsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.godotlaunch.backend.service.ClamAVService;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

@Component
@RequiredArgsConstructor
@Slf4j
public class UnifiedAssetUploadHelper {

    private final AssetRepository assetRepository;
    private final MediaRepository mediaRepository;
    private final SeaweedFsService seaweedFsService;
    private final ClamAVService clamAVService;
    private final AsyncVirusScanService asyncVirusScanService;
    private final AiReviewService aiReviewService;
    private final com.godotlaunch.backend.service.NotificationService notificationService;
    private final com.godotlaunch.backend.repository.UserRepository userRepository;

    private static final long MAX_UNCOMPRESSED_SIZE_BYTES = 500L * 1024 * 1024; // 500 MB
    private static final int MAX_ENTRY_COUNT = 1000;
    private static final int MAX_SCREENSHOTS = 10;

    @Async
    public void processUnifiedAssetZipAsync(UUID itemId, File rawZipFile) {
        log.info("Starting background processing of unified asset zip for item {}", itemId);
        File tempDir = null;
        try {
            Asset item = assetRepository.findById(itemId)
                    .orElseThrow(() -> new IllegalArgumentException("Asset not found: " + itemId));

            // Calculate SHA-256 hash of the uploaded ZIP and verify if it is different
            String newHash = calculateSha256(rawZipFile);
            if (newHash != null && "SUCCESS".equals(item.getUploadStatus()) && newHash.equals(item.getZipHash())) {
                throw new IllegalArgumentException("Nội dung file ZIP tài nguyên trùng khớp hoàn toàn với phiên bản hiện tại. Vui lòng thực hiện cập nhật trước khi tải lên.");
            }

            // 1. Tạo thư mục tạm để giải nén
            tempDir = Files.createTempDirectory("unified-upload-" + itemId).toFile();

            // 2. Giải nén và thực hiện validate bảo mật (Zip Slip & Zip Bomb)
            unzipAndValidate(rawZipFile, tempDir);

            // 2.5. Quét virus ClamAV đệ quy trên TOÀN BỘ các file giải nén trước khi xử lý media/assets
            scanDirectoryForViruses(tempDir);

            // 3. Xác định thư mục gốc thực sự của tài nguyên (Unwrap nếu zip bị bọc bởi 1 thư mục cha)
            File rootDir = tempDir;
            File[] filesInTemp = tempDir.listFiles(f -> {
                String name = f.getName();
                return f.isDirectory() && !name.equals("__MACOSX") && !name.startsWith(".");
            });
            if (filesInTemp != null && filesInTemp.length == 1) {
                File candidate = filesInTemp[0];
                if (new File(candidate, "thumbnail").isDirectory() || new File(candidate, "assets").isDirectory()) {
                    rootDir = candidate;
                }
            }

            File thumbnailDir = new File(rootDir, "thumbnail");
            File screenshotsDir = new File(rootDir, "screenshots");
            File videoDir = new File(rootDir, "video");
            File assetsDir = new File(rootDir, "assets");

            if (!thumbnailDir.isDirectory()) {
                throw new IllegalArgumentException("Cấu trúc file zip không hợp lệ: Thiếu thư mục 'thumbnail/'");
            }
            if (!assetsDir.isDirectory() || assetsDir.listFiles() == null || assetsDir.listFiles().length == 0) {
                throw new IllegalArgumentException("Cấu trúc file zip không hợp lệ: Thiếu thư mục 'assets/' hoặc thư mục 'assets/' rỗng");
            }

            // 4. Trích xuất và upload Thumbnail
            File[] thumbnailFiles = thumbnailDir.listFiles((dir, name) -> isImageFile(name));
            if (thumbnailFiles == null || thumbnailFiles.length == 0) {
                throw new IllegalArgumentException("Thư mục 'thumbnail/' không chứa file hình ảnh hợp lệ");
            }
            File thumbnailFile = thumbnailFiles[0];
            String thumbKey = "marketplace/items/" + itemId + "/media/" + UUID.randomUUID() + getExtension(thumbnailFile.getName());
            String thumbnailUrl;
            try (InputStream is = new FileInputStream(thumbnailFile)) {
                thumbnailUrl = seaweedFsService.uploadStream(is, thumbKey, getContentType(thumbnailFile.getName()));
            }
            // Xóa media cũ của thumbnail nếu có
            deleteItemMediaByType(itemId, "thumbnail");
            // Lưu thumbnail media
            Media thumbMedia = new Media();
            thumbMedia.setAsset(item);
            thumbMedia.setMediaType("thumbnail");
            thumbMedia.setMediaUrl(thumbnailUrl);
            mediaRepository.save(thumbMedia);

            item.setThumbnailUrl(thumbnailUrl);

            // 5. Trích xuất và upload Screenshots (Tối đa 10 ảnh)
            File[] screenshotFiles = screenshotsDir.listFiles((dir, name) -> isImageFile(name));
            if (screenshotFiles != null && screenshotFiles.length > 0) {
                java.util.Arrays.sort(screenshotFiles, java.util.Comparator.comparing(File::getName));
                if (screenshotFiles.length > MAX_SCREENSHOTS) {
                    throw new IllegalArgumentException("Vượt quá số lượng screenshots tối đa cho phép (Giới hạn: " + MAX_SCREENSHOTS + " ảnh)");
                }
                // Xóa screenshots cũ
                deleteItemMediaByType(itemId, "screenshot");
                for (File shotFile : screenshotFiles) {
                    String shotKey = "marketplace/items/" + itemId + "/media/" + UUID.randomUUID() + getExtension(shotFile.getName());
                    String shotUrl;
                    try (InputStream is = new FileInputStream(shotFile)) {
                        shotUrl = seaweedFsService.uploadStream(is, shotKey, getContentType(shotFile.getName()));
                    }
                    Media shotMedia = new Media();
                    shotMedia.setAsset(item);
                    shotMedia.setMediaType("screenshot");
                    shotMedia.setMediaUrl(shotUrl);
                    mediaRepository.save(shotMedia);
                }
            }

            // 6. Trích xuất và upload Video (nếu có)
            File[] videoFiles = videoDir.listFiles((dir, name) -> isVideoFile(name));
            if (videoFiles != null && videoFiles.length > 0) {
                File videoFile = videoFiles[0];
                String videoKey = "marketplace/items/" + itemId + "/media/" + UUID.randomUUID() + getExtension(videoFile.getName());
                String videoUrl;
                try (InputStream is = new FileInputStream(videoFile)) {
                    videoUrl = seaweedFsService.uploadStream(is, videoKey, getContentType(videoFile.getName()));
                }
                // Xóa video cũ
                deleteItemMediaByType(itemId, "video");
                Media videoMedia = new Media();
                videoMedia.setAsset(item);
                videoMedia.setMediaType("video");
                videoMedia.setMediaUrl(videoUrl);
                mediaRepository.save(videoMedia);
            }

            // 7. Đóng gói thư mục assets/ thành product_files.zip và upload
            File productZipFile = new File(tempDir, "product_files.zip");
            zipDirectory(assetsDir, productZipFile);

            String productKey = "marketplace/items/" + itemId + "/project.zip";
            String fileUrl;
            try (InputStream is = new FileInputStream(productZipFile)) {
                fileUrl = seaweedFsService.uploadStream(is, productKey, "application/zip");
            }
            item.setFileUrl(fileUrl);

            // 8. Cập nhật trạng thái thành công
            item.setUploadStatus("SUCCESS");
            item.setUploadError(null);
            item.setZipHash(newHash);
            item.setVersion(com.godotlaunch.backend.util.VersionUtils.incrementVersion(item.getVersion()));
            item.setStatus(ItemStatus.pending);
            assetRepository.save(item);
            log.info("Unified asset upload processing completed successfully for item {}", itemId);

            // 9. Kích hoạt Virus Scan & AI Review bất đồng bộ
            asyncVirusScanService.scanAndProcessAsset(itemId, productKey);
            aiReviewService.reviewAssetAsync(itemId);

            // 10. Thông báo cho Admins khi developer upload/cập nhật tệp asset
            try {
                org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
                java.util.List<com.godotlaunch.backend.entity.User> admins = userRepository.findAdminsOrderByCreatedAtAsc(pageable);
                com.godotlaunch.backend.entity.User seller = item.getSeller();
                String devName = seller != null && seller.getFullName() != null && !seller.getFullName().isBlank() ? seller.getFullName() : (seller != null ? seller.getEmail() : "Developer");
                String notifMsg = "Nhà phát triển " + devName + " vừa tải lên tệp sản phẩm Asset chờ phê duyệt: \"" + item.getTitle() + "\".";
                for (com.godotlaunch.backend.entity.User admin : admins) {
                    notificationService.createAndSendNotification(
                            admin,
                            seller,
                            com.godotlaunch.backend.entity.enums.NotificationType.NEW_SUBMISSION,
                            notifMsg,
                            itemId.toString()
                    );
                }
            } catch (Exception ex) {
                log.warn("Lỗi gửi thông báo NEW_SUBMISSION tới admin khi upload asset ZIP: {}", ex.getMessage());
            }

        } catch (Exception e) {
            log.error("Error processing unified asset upload for item {}", itemId, e);
            try {
                Asset item = assetRepository.findById(itemId).orElse(null);
                if (item != null) {
                    item.setUploadStatus("FAILED");
                    item.setUploadError(e.getMessage() != null ? e.getMessage() : "Unknown error occurred during processing");
                    assetRepository.save(item);
                }
            } catch (Exception dbEx) {
                log.error("Failed to update error status in DB for item {}", itemId, dbEx);
            }
        } finally {
            // Dọn dẹp tệp zip gốc thô
            if (rawZipFile != null && rawZipFile.exists()) {
                rawZipFile.delete();
            }
            // Dọn dẹp thư mục tạm thời giải nén
            if (tempDir != null && tempDir.exists()) {
                deleteDirectoryRecursive(tempDir);
            }
        }
    }

    private void unzipAndValidate(File zipFile, File destDir) throws IOException {
        byte[] buffer = new byte[4096];
        long totalBytes = 0;
        int entryCount = 0;

        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zipFile))) {
            ZipEntry entry = zis.getNextEntry();
            while (entry != null) {
                entryCount++;
                if (entryCount > MAX_ENTRY_COUNT) {
                    throw new IllegalArgumentException("Zip Bomb detected: Vượt quá số lượng file tối đa cho phép (" + MAX_ENTRY_COUNT + " files)");
                }

                File targetFile = new File(destDir, entry.getName());
                // Chặn Zip Slip (Directory Traversal)
                String canonicalPath = targetFile.getCanonicalPath();
                if (!canonicalPath.startsWith(destDir.getCanonicalPath() + File.separator)) {
                    throw new SecurityException("Zip Slip detected! Tên file không hợp lệ: " + entry.getName());
                }

                if (entry.isDirectory()) {
                    if (!targetFile.isDirectory() && !targetFile.mkdirs()) {
                        throw new IOException("Failed to create directory " + targetFile);
                    }
                } else {
                    // Tạo các thư mục cha nếu chưa có
                    File parent = targetFile.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) {
                        throw new IOException("Failed to create directory " + parent);
                    }

                    // Ghi file
                    try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            totalBytes += len;
                            if (totalBytes > MAX_UNCOMPRESSED_SIZE_BYTES) {
                                throw new IllegalArgumentException("Zip Bomb detected: Vượt quá dung lượng giải nén tối đa cho phép (" + (MAX_UNCOMPRESSED_SIZE_BYTES / (1024 * 1024)) + " MB)");
                            }
                            fos.write(buffer, 0, len);
                        }
                    }
                }
                entry = zis.getNextEntry();
            }
            zis.closeEntry();
        }
    }

    private void zipDirectory(File sourceFolder, File zipFile) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(zipFile);
             ZipOutputStream zos = new ZipOutputStream(fos)) {
            zipSubDirectory("", sourceFolder, zos);
        }
    }

    private void zipSubDirectory(String basePath, File dir, ZipOutputStream zos) throws IOException {
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File file : files) {
            String entryName = basePath.isEmpty() ? file.getName() : basePath + "/" + file.getName();
            if (file.isDirectory()) {
                zipSubDirectory(entryName, file, zos);
            } else {
                byte[] buffer = new byte[4096];
                try (FileInputStream fis = new FileInputStream(file)) {
                    zos.putNextEntry(new ZipEntry(entryName));
                    int length;
                    while ((length = fis.read(buffer)) > 0) {
                        zos.write(buffer, 0, length);
                    }
                    zos.closeEntry();
                }
            }
        }
    }

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

    private String extractObjectKeyFromUrl(String url) {
        if (url == null) return null;
        String seaweedMarker = "/godotlaunch/";
        int seaweedIndex = url.indexOf(seaweedMarker);
        if (seaweedIndex != -1) {
            return url.substring(seaweedIndex + seaweedMarker.length());
        }
        return url;
    }

    private void deleteDirectoryRecursive(File path) {
        File[] files = path.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    deleteDirectoryRecursive(f);
                } else {
                    f.delete();
                }
            }
        }
        path.delete();
    }

    private boolean isImageFile(String name) {
        String lower = name.toLowerCase();
        return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif");
    }

    private boolean isVideoFile(String name) {
        String lower = name.toLowerCase();
        return lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".avi");
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf("."));
    }

    private String getContentType(String filename) {
        if (filename == null) return "application/octet-stream";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".zip")) return "application/zip";
        return "application/octet-stream";
    }

    private String calculateSha256(File file) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            try (InputStream is = new FileInputStream(file)) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = is.read(buffer)) > 0) {
                    digest.update(buffer, 0, read);
                }
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
            log.error("Failed to calculate SHA-256 for file: " + file.getName(), e);
            return null;
        }
    }

    private void scanDirectoryForViruses(File tempDir) {
        log.info("Đang tiến hành quét ClamAV đệ quy toàn bộ tệp tin giải nén trong {}", tempDir.getName());
        try (var stream = Files.walk(tempDir.toPath())) {
            java.util.List<Path> filesToScan = stream
                    .filter(Files::isRegularFile)
                    .toList();

            log.info("Tìm thấy {} tệp tin giải nén. Bắt đầu quét virus qua ClamAV...", filesToScan.size());
            for (Path filePath : filesToScan) {
                try (InputStream is = new FileInputStream(filePath.toFile())) {
                    boolean isClean = clamAVService.scanStream(is);
                    if (!isClean) {
                        String fileName = filePath.getFileName().toString();
                        String cleanRelPath = tempDir.toPath().relativize(filePath).toString().replace('\\', '/');
                        log.warn("PHÁT HIỆN MÃ ĐỘC trong tệp tin: {} (Đường dẫn: {})", fileName, cleanRelPath);
                        throw new SecurityException("Phát hiện mã độc (Virus/Malware) trong tệp tin: " + fileName + ". Tiến hành từ chối và hủy tải lên để bảo vệ an toàn.");
                    }
                }
            }
            log.info("Quét ClamAV đệ quy hoàn tất: AN TOÀN 100% cho {} tệp tin.", filesToScan.size());
        } catch (SecurityException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi duyệt thư mục tạm để quét virus: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi trong quá trình quét virus: " + e.getMessage(), e);
        }
    }
}
