package com.godotlaunch.backend.util;

import lombok.extern.slf4j.Slf4j;
import java.io.*;
import java.nio.file.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Slf4j
public class SafeZipUnpacker {

    private static final int MAX_FILE_COUNT = 1000;             // Giới hạn tối đa 1000 tệp tin con
    private static final long MAX_UNZIPPED_SIZE = 524288000;     // Giới hạn tối đa 500MB giải nén
    private static final int BUFFER_SIZE = 4096;

    /**
     * Giải nén file an toàn bảo vệ hệ thống khỏi Zip Slip và Zip Bomb.
     *
     * @param zipInputStream Luồng dữ liệu file zip đầu vào
     * @param targetDirectory Thư mục đích giải nén
     * @throws IOException Khi có lỗi đọc ghi
     * @throws SecurityException Khi phát hiện hành vi Zip Slip
     * @throws IllegalStateException Khi vượt ngưỡng kích hoạt Zip Bomb
     */
    public static void unzipSafely(InputStream zipInputStream, Path targetDirectory) throws IOException {
        Path canonicalTargetDir = targetDirectory.toAbsolutePath().normalize();
        
        // Tạo thư mục nếu chưa tồn tại
        if (!Files.exists(canonicalTargetDir)) {
            Files.createDirectories(canonicalTargetDir);
        }

        int fileCount = 0;
        long totalSize = 0;

        try (ZipInputStream zis = new ZipInputStream(new BufferedInputStream(zipInputStream))) {
            ZipEntry entry = zis.getNextEntry();
            while (entry != null) {
                // 1. Chống lỗi Zip Slip (Path Traversal)
                // Phải normalize để khử các ký tự đặc biệt như ".."
                Path targetFilePath = canonicalTargetDir.resolve(entry.getName()).toAbsolutePath().normalize();

                // Xác minh tệp tin giải nén phải nằm trong thư mục đích
                if (!targetFilePath.startsWith(canonicalTargetDir)) {
                    log.error("Cảnh báo bảo mật: Phát hiện âm mưu tấn công Zip Slip! File path: {}", entry.getName());
                    throw new SecurityException("Phát hiện hành vi phá hoại bảo mật (Zip Slip)! Thao tác giải nén bị từ chối.");
                }

                if (entry.isDirectory()) {
                    Files.createDirectories(targetFilePath);
                } else {
                    fileCount++;
                    
                    // Kiểm tra giới hạn số lượng file giải nén chống nghẽn đĩa và I/O
                    if (fileCount > MAX_FILE_COUNT) {
                        log.error("Cảnh báo bảo mật: Vượt quá số lượng file cho phép trong tệp ZIP (> {})", MAX_FILE_COUNT);
                        throw new IllegalStateException("Hủy giải nén: Số lượng file con vượt giới hạn 1000 file.");
                    }

                    // Đảm bảo thư mục cha của file tồn tại
                    Files.createDirectories(targetFilePath.getParent());

                    // Đọc ghi file và kiểm tra dung lượng động để chống Zip Bomb
                    try (BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(targetFilePath.toFile()))) {
                        byte[] buffer = new byte[BUFFER_SIZE];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            totalSize += len;
                            
                            // Kiểm tra vượt tổng dung lượng giải nén cho phép
                            if (totalSize > MAX_UNZIPPED_SIZE) {
                                log.error("Cảnh báo bảo mật: Dung lượng giải nén thực tế vượt ngưỡng giới hạn cho phép (> {} bytes)", MAX_UNZIPPED_SIZE);
                                throw new IllegalStateException("Hủy giải nén: Kích thước tổng sau giải nén vượt giới hạn 500MB.");
                            }
                            
                            bos.write(buffer, 0, len);
                        }
                    }
                }
                
                zis.closeEntry();
                entry = zis.getNextEntry();
            }
        }
        
        log.info("Giải nén ZIP thành công và an toàn. Tổng số file: {}, Tổng dung lượng: {} bytes", fileCount, totalSize);
    }
}
