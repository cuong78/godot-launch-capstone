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
 * Central storage controller. Hardcoded to route exclusively to SeaweedFS.
 * Preserves method signatures to minimize refactoring across services.
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
        log.info("StorageRouter initialized exclusively with SeaweedFS: {}:{}{}", filerHost, filerPort, basePath);
    }

    /**
     * Upload file, defaulting to SeaweedFS Filer.
     */
    public String upload(FileType fileType, MultipartFile file, String prefix) {
        String objectKey = prefix + "/" + UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
        return seaweedAdapter.upload(file, objectKey);
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "file";
        }
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_").replaceAll("_+", "_");
    }

    /**
     * Upload with a specific fixed objectKey to SeaweedFS.
     */
    public String uploadWithKey(FileType fileType, MultipartFile file, String objectKey) {
        return seaweedAdapter.upload(file, objectKey);
    }

    /**
     * Read file from SeaweedFS by key.
     */
    public InputStream getInputStream(FileType fileType, String objectKey) {
        if (seaweedAdapter instanceof SeaweedFsAdapter seaweed) {
            return seaweed.readFile(objectKey);
        }
        throw new RuntimeException("seaweedAdapter is not an instance of SeaweedFsAdapter");
    }

    /**
     * Read file from SeaweedFS by URL.
     */
    public InputStream getInputStream(String fileUrl, FileType fileType, String objectKey) {
        if (seaweedAdapter instanceof SeaweedFsAdapter seaweed) {
            return seaweed.readFile(objectKey);
        }
        throw new RuntimeException("seaweedAdapter is not an instance of SeaweedFsAdapter");
    }

    /**
     * Get public URL from SeaweedFS.
     */
    public String getPublicUrl(FileType fileType, String objectKey) {
        return seaweedAdapter.getPublicUrl(objectKey);
    }

    /**
     * Active provider for this fileType. Always returns seaweedfs.
     */
    public String getProvider(FileType fileType) {
        return "seaweedfs";
    }

    /**
     * Delete file from SeaweedFS.
     */
    public void delete(FileType fileType, String objectKey) {
        seaweedAdapter.delete(objectKey);
    }

    /**
     * Delete file from SeaweedFS by URL.
     */
    public void delete(String fileUrl, FileType fileType, String objectKey) {
        seaweedAdapter.delete(objectKey);
    }

    /**
     * Clear Cache (No-op).
     */
    public void clearCache() {
        log.info("StorageRouter clearCache called (no-op)");
    }
}
