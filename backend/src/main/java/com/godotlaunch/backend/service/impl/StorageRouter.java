package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.StorageAccount;
import com.godotlaunch.backend.entity.StorageBucket;
import com.godotlaunch.backend.entity.StorageRouting;
import com.godotlaunch.backend.entity.enums.FileType;
import com.godotlaunch.backend.repository.StorageRoutingRepository;
import com.godotlaunch.backend.security.EncryptionUtils;
import com.godotlaunch.backend.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Router trung tâm: nhận upload request, đọc routing config từ DB,
 * khởi tạo đúng adapter (S3 / SeaweedFS) và thực hiện upload.
 *
 * Cache adapter 60s để tránh query DB mỗi request.
 * Khi admin thay đổi routing → gọi clearCache() để apply ngay.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StorageRouter {

    private final StorageRoutingRepository routingRepository;
    private final EncryptionUtils encryptionUtils;

    // Cache: fileType → adapter
    private final Map<String, StorageService> adapterCache = new ConcurrentHashMap<>();
    private volatile long cacheRefreshedAt = 0;
    private static final long CACHE_TTL_MS = 60_000;

    /**
     * Upload file theo fileType, tự resolve đúng provider từ routing config.
     * @param fileType loại file (avatar, thumbnail, game_zip, ...)
     * @param file     file upload
     * @param prefix   prefix trong bucket (ví dụ: "avatars")
     * @return public URL
     */
    public String upload(FileType fileType, MultipartFile file, String prefix) {
        StorageService adapter = resolveAdapter(fileType.name());
        String objectKey = prefix + "/" + UUID.randomUUID() + "_" + file.getOriginalFilename();
        return adapter.upload(file, objectKey);
    }

    /**
     * Xóa file — dùng khi biết fileType và objectKey (fid với SeaweedFS, key với S3).
     */
    public void delete(FileType fileType, String objectKey) {
        resolveAdapter(fileType.name()).delete(objectKey);
    }

    /**
     * Xóa cache — gọi sau khi admin cập nhật routing.
     */
    public void clearCache() {
        adapterCache.clear();
        cacheRefreshedAt = 0;
        log.info("StorageRouter cache cleared");
    }

    // ── private ──────────────────────────────────────────────

    private StorageService resolveAdapter(String fileType) {
        long now = System.currentTimeMillis();
        if (now - cacheRefreshedAt > CACHE_TTL_MS) {
            adapterCache.clear();
            cacheRefreshedAt = now;
        }

        return adapterCache.computeIfAbsent(fileType, ft -> {
            Optional<StorageRouting> routing = routingRepository.findByFileTypeWithJoin(ft);
            if (routing.isEmpty()) {
                throw new RuntimeException("No storage routing configured for file type: " + ft);
            }
            StorageBucket bucket = routing.get().getBucket();
            StorageAccount account = bucket.getAccount();
            String decryptedConfig = encryptionUtils.decrypt(account.getConfig());
            return buildAdapter(account.getProvider(), decryptedConfig);
        });
    }

    private StorageService buildAdapter(String provider, String configJson) {
        return switch (provider) {
            case "aws_s3" -> new AwsS3Adapter(configJson);
            case "seaweedfs" -> new SeaweedFsAdapter(configJson);
            default -> throw new RuntimeException("Unknown storage provider: " + provider);
        };
    }
}
