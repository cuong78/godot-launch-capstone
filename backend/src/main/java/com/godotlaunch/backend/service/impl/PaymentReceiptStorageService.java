package com.godotlaunch.backend.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@Slf4j
public class PaymentReceiptStorageService {

    private static final String LOCAL_URI_PREFIX = "local://payment-receipts/";
    private final Path baseDir = Path.of(System.getProperty("java.io.tmpdir"), "godotlaunch", "payment-receipts");

    public String storeLocally(MultipartFile file) {
        try {
            Files.createDirectories(baseDir);
            String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
            String safeFilename = UUID.randomUUID() + (StringUtils.hasText(extension) ? "." + extension : "");
            Path target = baseDir.resolve(safeFilename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            log.warn("Stored payment receipt locally at {} because remote storage is not configured.", target);
            return LOCAL_URI_PREFIX + safeFilename;
        } catch (IOException ex) {
            throw new RuntimeException("Unable to store payment receipt locally.", ex);
        }
    }

    public boolean isLocalStorageRef(String storageRef) {
        return storageRef != null && storageRef.startsWith(LOCAL_URI_PREFIX);
    }

    public Resource loadAsResource(String storageRef) {
        if (!isLocalStorageRef(storageRef)) {
            throw new RuntimeException("Payment receipt is not stored in local fallback storage.");
        }

        try {
            String filename = storageRef.substring(LOCAL_URI_PREFIX.length());
            Path filePath = baseDir.resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new RuntimeException("Payment receipt file does not exist or is not readable.");
            }
            return resource;
        } catch (MalformedURLException ex) {
            throw new RuntimeException("Unable to load local payment receipt file.", ex);
        }
    }
}
