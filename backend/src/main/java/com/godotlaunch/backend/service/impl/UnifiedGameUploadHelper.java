package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.service.SeaweedFsService;
import com.godotlaunch.backend.service.ClamAVService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
@RequiredArgsConstructor
@Slf4j
public class UnifiedGameUploadHelper {

    private final GameRepository gameRepository;
    private final MediaRepository mediaRepository;
    private final SeaweedFsService seaweedFsService;
    private final ClamAVService clamAVService;

    private static final long MAX_UNCOMPRESSED_SIZE_BYTES = 500L * 1024 * 1024; // 500 MB
    private static final int MAX_ENTRY_COUNT = 2000;
    private static final int MAX_SCREENSHOTS = 10;

    @Async
    public void processUnifiedGameZipAsync(UUID gameId, File rawZipFile) {
        log.info("Starting background processing of unified game zip for game {}", gameId);
        File tempDir = null;
        try {
            Game game = gameRepository.findById(gameId)
                    .orElseThrow(() -> new IllegalArgumentException("Game not found: " + gameId));

            // 1. Quét virus ClamAV trên toàn bộ file ZIP nén
            scanZipFileWithClamAV(rawZipFile);

            // 2. Tạo thư mục tạm để giải nén
            tempDir = Files.createTempDirectory("unified-game-upload-" + gameId).toFile();

            // 3. Giải nén và thực hiện validate bảo mật (Zip Slip & Zip Bomb)
            unzipAndValidate(rawZipFile, tempDir);

            // 3. Tự động xử lý bọc ngoài (Unwrap folder)
            File rootDir = tempDir;
            File[] filesInTemp = tempDir.listFiles(f -> {
                String name = f.getName();
                return f.isDirectory() && !name.equals("__MACOSX") && !name.startsWith(".");
            });
            if (filesInTemp != null && filesInTemp.length == 1) {
                File candidate = filesInTemp[0];
                if (new File(candidate, "thumbnail").isDirectory() || new File(candidate, "web_demo").isDirectory()) {
                    rootDir = candidate;
                }
            }

            // 4. Định tuyến thư mục con
            File thumbnailDir = new File(rootDir, "thumbnail");
            File screenshotsDir = new File(rootDir, "screenshots");
            File videoDir = new File(rootDir, "video");
            File webDemoDir = new File(rootDir, "web_demo");

            if (!thumbnailDir.isDirectory()) {
                throw new IllegalArgumentException("Cấu trúc file zip không hợp lệ: Thiếu thư mục 'thumbnail/'");
            }

            // 5. Trích xuất và upload Thumbnail
            File[] thumbnailFiles = thumbnailDir.listFiles((dir, name) -> isImageFile(name));
            if (thumbnailFiles == null || thumbnailFiles.length == 0) {
                throw new IllegalArgumentException("Thư mục 'thumbnail/' không chứa file hình ảnh hợp lệ");
            }
            File thumbnailFile = thumbnailFiles[0];
            String thumbKey = "games/" + gameId + "/media/" + UUID.randomUUID() + getExtension(thumbnailFile.getName());
            String thumbnailUrl;
            try (InputStream is = new FileInputStream(thumbnailFile)) {
                thumbnailUrl = seaweedFsService.uploadStream(is, thumbKey, getContentType(thumbnailFile.getName()));
            }
            game.setThumbnailUrl(thumbnailUrl);

            // 6. Trích xuất và upload Screenshots (Tối đa 10 ảnh)
            File[] screenshotFiles = screenshotsDir.listFiles((dir, name) -> isImageFile(name));
            if (screenshotFiles != null && screenshotFiles.length > 0) {
                java.util.Arrays.sort(screenshotFiles, java.util.Comparator.comparing(File::getName));
                if (screenshotFiles.length > MAX_SCREENSHOTS) {
                    throw new IllegalArgumentException("Vượt quá số lượng screenshots tối đa cho phép (Giới hạn: " + MAX_SCREENSHOTS + " ảnh)");
                }
                // Xóa screenshots cũ
                deleteGameMediaByType(gameId, "screenshot");
                for (File shotFile : screenshotFiles) {
                    String shotKey = "games/" + gameId + "/media/" + UUID.randomUUID() + getExtension(shotFile.getName());
                    String shotUrl;
                    try (InputStream is = new FileInputStream(shotFile)) {
                        shotUrl = seaweedFsService.uploadStream(is, shotKey, getContentType(shotFile.getName()));
                    }
                    Media shotMedia = new Media();
                    shotMedia.setGame(game);
                    shotMedia.setMediaType("screenshot");
                    shotMedia.setMediaUrl(shotUrl);
                    mediaRepository.save(shotMedia);
                }
            }

            // 7. Trích xuất và upload Video Trailer (nếu có)
            File[] videoFiles = videoDir.listFiles((dir, name) -> isVideoFile(name));
            if (videoFiles != null && videoFiles.length > 0) {
                File videoFile = videoFiles[0];
                String videoKey = "games/" + gameId + "/media/" + UUID.randomUUID() + getExtension(videoFile.getName());
                String videoUrl;
                try (InputStream is = new FileInputStream(videoFile)) {
                    videoUrl = seaweedFsService.uploadStream(is, videoKey, getContentType(videoFile.getName()));
                }
                // Xóa video cũ
                deleteGameMediaByType(gameId, "video");
                Media videoMedia = new Media();
                videoMedia.setGame(game);
                videoMedia.setMediaType("video");
                videoMedia.setMediaUrl(videoUrl);
                mediaRepository.save(videoMedia);
            }

            // 8. Trích xuất và upload Web Demo (Bắt buộc đối với Game)
            if (!webDemoDir.isDirectory()) {
                throw new IllegalArgumentException("Cấu trúc file zip không hợp lệ: Thiếu thư mục 'web_demo/'");
            }
            
            Path demoRoot = findDemoRoot(webDemoDir.toPath());
            if (demoRoot == null) {
                throw new IllegalArgumentException("Thư mục 'web_demo/' không hợp lệ: Không tìm thấy file chạy (.html)");
            }

                // Kiểm tra các file HTML5 cốt lõi (.html, .js, .wasm, .pck)
                File[] demoFiles = demoRoot.toFile().listFiles();
                boolean hasHtml = false;
                boolean hasJs = false;
                boolean hasWasm = false;
                boolean hasPck = false;
                String htmlFileName = null;

                if (demoFiles != null) {
                    for (File f : demoFiles) {
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
                    throw new IllegalArgumentException("Cấu trúc thư mục 'web_demo/' không hợp lệ. Thiếu tệp: " + String.join(", ", missing));
                }

                // Upload đệ quy web_demo lên SeaweedFS
                String oldWebDemoUrl = game.getWebDemoUrl();
                String demoVersion = UUID.randomUUID().toString();
                String demoPrefix = "games/" + gameId + "/web_demo/" + demoVersion;
                uploadDirectoryRecursive(demoRoot.toFile(), demoRoot.toFile(), demoPrefix);

                String indexKey = demoPrefix + "/" + htmlFileName;
                String webDemoUrl = seaweedFsService.getFileUrl(indexKey);
                game.setWebDemoUrl(webDemoUrl);

                // Xóa bản demo cũ nếu có
                if (oldWebDemoUrl != null) {
                    String oldPrefix = extractWebDemoVersionPrefix(oldWebDemoUrl);
                    if (oldPrefix != null && !oldPrefix.equals(demoPrefix)) {
                        try {
                            seaweedFsService.deleteObjectRecursive(oldPrefix);
                        } catch (Exception ignored) {}
                    }
                }

            // 9. Cập nhật trạng thái thành công
            game.setUploadStatus("SUCCESS");
            game.setUploadError(null);
            gameRepository.save(game);
            log.info("Unified game upload processing completed successfully for game {}", gameId);

        } catch (Exception e) {
            log.error("Error processing unified game upload for game {}", gameId, e);
            try {
                // Thu hồi/Xóa các file đã upload lên SeaweedFS khi có lỗi giữa chừng để tránh rác dung lượng
                deleteGameMediaByType(gameId, "screenshot");
                deleteGameMediaByType(gameId, "video");
                
                Game game = gameRepository.findById(gameId).orElse(null);
                if (game != null) {
                    game.setUploadStatus("FAILED");
                    game.setUploadError(e.getMessage() != null ? e.getMessage() : "Unknown error occurred during processing");
                    gameRepository.save(game);
                }
            } catch (Exception dbEx) {
                log.error("Failed to update error status in DB for game {}", gameId, dbEx);
            }
        } finally {
            if (rawZipFile != null && rawZipFile.exists()) {
                rawZipFile.delete();
            }
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
                String canonicalPath = targetFile.getCanonicalPath();
                if (!canonicalPath.startsWith(destDir.getCanonicalPath() + File.separator)) {
                    throw new SecurityException("Zip Slip detected! Tên file không hợp lệ: " + entry.getName());
                }

                if (entry.isDirectory()) {
                    if (!targetFile.isDirectory() && !targetFile.mkdirs()) {
                        throw new IOException("Failed to create directory " + targetFile);
                    }
                } else {
                    File parent = targetFile.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) {
                        throw new IOException("Failed to create directory " + parent);
                    }

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

    private Path findDemoRoot(Path rootDir) throws IOException {
        try (var walk = Files.walk(rootDir)) {
            return walk.filter(p -> Files.isRegularFile(p) && p.getFileName().toString().toLowerCase().endsWith(".html"))
                    .map(Path::getParent)
                    .findFirst()
                    .orElse(null);
        }
    }

    private void uploadDirectoryRecursive(File root, File current, String demoPrefix) throws IOException {
        File[] files = current.listFiles();
        if (files == null) return;
        for (File file : files) {
            if (file.isDirectory()) {
                uploadDirectoryRecursive(root, file, demoPrefix);
            } else {
                String relative = root.toURI().relativize(file.toURI()).getPath();
                String objectKey = demoPrefix + "/" + relative;
                String contentType = getContentType(file.getName());
                String cacheControl = contentType.contains("html") ? "max-age=0, must-revalidate" : "max-age=31536000, immutable";
                try (InputStream is = new FileInputStream(file)) {
                    seaweedFsService.uploadStream(is, objectKey, contentType, cacheControl);
                }
            }
        }
    }

    private void deleteGameMediaByType(UUID gameId, String mediaType) {
        mediaRepository.findByGame_IdAndMediaType(gameId, mediaType)
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
        String filesMarker = "/files/";
        int filesIndex = url.indexOf(filesMarker);
        if (filesIndex != -1) {
            return url.substring(filesIndex + filesMarker.length());
        }
        String seaweedMarker = "/godotlaunch/";
        int seaweedIndex = url.indexOf(seaweedMarker);
        if (seaweedIndex != -1) {
            return url.substring(seaweedIndex + seaweedMarker.length());
        }
        return url;
    }

    private String extractWebDemoVersionPrefix(String webDemoUrl) {
        String key = extractObjectKeyFromUrl(webDemoUrl);
        if (key != null && key.contains("/web_demo/")) {
            int idx = key.indexOf("/web_demo/");
            int endIdx = key.indexOf("/", idx + "/web_demo/".length());
            if (endIdx != -1) {
                return key.substring(0, endIdx);
            }
        }
        return null;
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
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js")) return "application/javascript";
        if (lower.endsWith(".wasm")) return "application/wasm";
        if (lower.endsWith(".pck")) return "application/octet-stream";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".zip")) return "application/zip";
        return "application/octet-stream";
    }

    private void scanZipFileWithClamAV(File zipFile) {
        log.info("Đang tiến hành quét virus file ZIP qua ClamAV: {}", zipFile.getName());
        try (InputStream is = new FileInputStream(zipFile)) {
            boolean isClean = clamAVService.scanStream(is);
            if (!isClean) {
                log.warn("PHÁT HIỆN MÃ ĐỘC trong file ZIP: {}", zipFile.getName());
                throw new SecurityException("Phát hiện mã độc (Virus/Malware) trong file ZIP tải lên. Tiến hành từ chối và hủy tải lên để bảo vệ an toàn.");
            }
            log.info("Quét ClamAV hoàn tất: File ZIP AN TOÀN 100%.");
        } catch (SecurityException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi quét virus qua ClamAV: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi trong quá trình quét virus: " + e.getMessage(), e);
        }
    }
}
