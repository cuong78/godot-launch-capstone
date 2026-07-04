package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.enums.FileType;
import com.godotlaunch.backend.service.StorageService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

/**
 * Router trung tâm: Đã đơn giản hóa chỉ dùng SeaweedFS cấu hình tĩnh từ application.yaml.
 * Giữ nguyên các phương thức để tránh thay đổi diện rộng ở các service khác.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StorageRouter {

    @Value("${storage.seaweedfs.filer-host:localhost}")
    private String filerHost;

    @Value("${storage.seaweedfs.filer-port:8888}")
    private int filerPort;

    @Value("${storage.seaweedfs.base-path:/godotlaunch}")
    private String basePath;

    private StorageService seaweedAdapter;

    @PostConstruct
    public void init() {
        this.seaweedAdapter = new SeaweedFsAdapter(filerHost, filerPort, basePath);
        log.info("StorageRouter initialized with SeaweedFS adapter: {}:{}{}", filerHost, filerPort, basePath);
    }

    /**
     * Upload file theo fileType, tự resolve đúng provider từ routing config.
     * @param fileType loại file (avatar, thumbnail, game_zip, ...)
     * @param file     file upload
     * @param prefix   prefix trong bucket (ví dụ: "avatars")
     * @return public URL
     */
    public String upload(FileType fileType, MultipartFile file, String prefix) {
        String objectKey = prefix + "/" + UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
        return seaweedAdapter.upload(file, objectKey);
    }

    /**
     * Làm sạch tên file: bỏ dấu cách, ngoặc, ký tự đặc biệt (gây lỗi URL với SeaweedFS,
     * và rắc rối khi truy cập). Giữ chữ/số/dấu chấm/gạch ngang/gạch dưới.
     */
    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "file";
        }
        // Thay mọi ký tự không an toàn bằng '_', gộp '_' liên tiếp
        String cleaned = filename.replaceAll("[^a-zA-Z0-9._-]", "_").replaceAll("_+", "_");
        return cleaned.isBlank() ? "file" : cleaned;
    }

    /**
     * Upload với objectKey cố định (không random) — dùng khi cần đọc lại file
     * theo key đã biết, ví dụ virus scan marketplace zip.
     * @return public URL
     */
    public String uploadWithKey(FileType fileType, MultipartFile file, String objectKey) {
        return seaweedAdapter.upload(file, objectKey);
    }

    /**
     * Đọc file về dạng InputStream theo objectKey — dispatch đúng provider.
     * Caller có trách nhiệm đóng stream.
     */
    public InputStream getInputStream(FileType fileType, String objectKey) {
        if (seaweedAdapter instanceof SeaweedFsAdapter seaweed) {
            return seaweed.readFile(objectKey);
        }
        throw new RuntimeException("seaweedAdapter is not an instance of SeaweedFsAdapter");
    }

    /**
     * Đọc file về dạng InputStream tự động phát hiện provider qua URL.
     */
    public InputStream getInputStream(String fileUrl, FileType fileType, String objectKey) {
        if (seaweedAdapter instanceof SeaweedFsAdapter seaweed) {
            return seaweed.readFile(objectKey);
        }
        throw new RuntimeException("seaweedAdapter is not an instance of SeaweedFsAdapter");
    }

    /**
     * Public URL của file theo objectKey — dispatch đúng provider.
     */
    public String getPublicUrl(FileType fileType, String objectKey) {
        return seaweedAdapter.getPublicUrl(objectKey);
    }

    /**
     * Provider hiện đang route cho fileType này ("aws_s3" | "seaweedfs").
     */
    public String getProvider(FileType fileType) {
        return "seaweedfs";
    }

    /**
     * Xóa file — dùng khi biết fileType và objectKey (fid với SeaweedFS, key với S3).
     */
    public void delete(FileType fileType, String objectKey) {
        seaweedAdapter.delete(objectKey);
    }

    /**
     * Xóa file tự động phát hiện provider qua URL.
     */
    public void delete(String fileUrl, FileType fileType, String objectKey) {
        seaweedAdapter.delete(objectKey);
    }

    /**
     * Xóa cache — giữ lại để tránh lỗi compile nếu có chỗ gọi.
     */
    public void clearCache() {
        log.info("StorageRouter clearCache called (no-op)");
    }
}
