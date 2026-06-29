package com.godotlaunch.backend.config;

import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.StorageAccount;
import com.godotlaunch.backend.entity.StorageBucket;
import com.godotlaunch.backend.entity.StorageRouting;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.FileType;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.StorageAccountRepository;
import com.godotlaunch.backend.repository.StorageBucketRepository;
import com.godotlaunch.backend.repository.StorageRoutingRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.security.EncryptionUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Configuration
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ApplicationInitConfig {

    UserRepository userRepository;
    RoleRepository roleRepository;
    PasswordEncoder passwordEncoder;
    StorageRoutingRepository storageRoutingRepository;
    StorageAccountRepository storageAccountRepository;
    StorageBucketRepository storageBucketRepository;
    EncryptionUtils encryptionUtils;

    @Bean
    public ApplicationRunner initializer() {
        return args -> {
            initAdminUser();
            syncStorageRoutingFileTypes();
            ensureDefaultStorageRouting();
        };
    }

    private void initAdminUser() {
        String adminEmail = "admin@godotlaunch.com";

        if (userRepository.findByEmail(adminEmail).isPresent()) {
            log.info("Admin user already exists. Skipping initialization.");
            return;
        }

        Role adminRole = roleRepository.findByName("admin")
                .orElseThrow(() -> new RuntimeException("Role 'admin' not found in database. Make sure schema.sql has run."));

        User admin = new User();
        admin.setEmail(adminEmail);
        admin.setPasswordHash(passwordEncoder.encode("admin"));
        admin.setFullName("Platform Administrator");
        admin.setStatus("active");
        admin.setRole(adminRole);

        userRepository.save(admin);
        log.info("Admin user has been created with default password: admin");
    }

    /**
     * Đồng bộ storage_routing với FileType enum.
     * FileType enum là NGUỒN CHÂN LÝ — mỗi giá trị enum phải có 1 dòng routing.
     * File_type mới (chưa từng có trong DB) → tạo dòng với bucket = null (chưa gán).
     * Admin gán bucket sau qua UI kéo-thả. KHÔNG xóa dòng dư (tránh mất routing đang dùng).
     */
    private void syncStorageRoutingFileTypes() {
        Set<String> existing = storageRoutingRepository.findAll().stream()
                .map(StorageRouting::getFileType)
                .collect(Collectors.toSet());

        var missing = Arrays.stream(FileType.values())
                .map(Enum::name)
                .filter(ft -> !existing.contains(ft))
                .toList();

        if (missing.isEmpty()) {
            log.info("Storage routing đã đồng bộ với FileType enum ({} file types).", existing.size());
            return;
        }

        missing.forEach(ft -> {
            StorageRouting routing = new StorageRouting();
            routing.setFileType(ft);
            routing.setBucket(null); // chưa gán — admin config sau
            storageRoutingRepository.save(routing);
        });
        log.info("Auto-seed {} file_type mới vào storage_routing (chưa gán bucket): {}", missing.size(), missing);
    }

    /**
     * Dev-friendly bootstrap:
     * - Nếu DB chưa có account/bucket storage nào, tự tạo 1 SeaweedFS account mặc định.
     * - Nếu có bucket mặc định, tự gán các file_type còn null bucket vào bucket này.
     *
     * Không ghi đè routing đã có sẵn, nên ít gây xung đột nhất.
     */
    private void ensureDefaultStorageRouting() {
        StorageBucket defaultBucket = resolveOrCreateDefaultBucket();
        if (defaultBucket == null) {
            log.warn("Không thể bootstrap storage mặc định vì chưa có bucket nào khả dụng.");
            return;
        }

        List<StorageRouting> unassigned = storageRoutingRepository.findAll().stream()
                .filter(r -> r.getBucket() == null)
                .toList();

        if (unassigned.isEmpty()) {
            log.info("Tất cả storage routing đã có bucket, không cần auto-assign mặc định.");
            return;
        }

        unassigned.forEach(routing -> routing.setBucket(defaultBucket));
        storageRoutingRepository.saveAll(unassigned);
        log.info("Đã auto-assign {} file_type vào bucket mặc định '{}' để tránh lỗi upload trong môi trường dev.",
                unassigned.size(), defaultBucket.getName());
    }

    private StorageBucket resolveOrCreateDefaultBucket() {
        List<StorageBucket> existingBuckets = storageBucketRepository.findAll();
        if (!existingBuckets.isEmpty()) {
            return existingBuckets.get(0);
        }

        List<StorageAccount> existingAccounts = storageAccountRepository.findAll();
        StorageAccount account;
        if (existingAccounts.isEmpty()) {
            account = new StorageAccount();
            account.setName("Default SeaweedFS (Dev)");
            account.setProvider("seaweedfs");
            account.setActive(true);
            account.setConfig(encryptionUtils.encrypt(buildDefaultSeaweedConfigJson()));
            account = storageAccountRepository.save(account);
            log.info("Đã tạo storage account mặc định cho SeaweedFS dev.");
        } else {
            account = existingAccounts.get(0);
        }

        StorageBucket bucket = new StorageBucket();
        bucket.setAccount(account);
        bucket.setName("godotlaunch-dev");
        bucket.setPublicUrl(buildDefaultSeaweedPublicUrl());
        bucket = storageBucketRepository.save(bucket);
        log.info("Đã tạo storage bucket mặc định '{}' cho provider '{}'.",
                bucket.getName(), account.getProvider());
        return bucket;
    }

    private String buildDefaultSeaweedConfigJson() {
        String basePath = normalizeBasePath("/godotlaunch");
        return """
                {"filerHost":"%s","filerHttpPort":%d,"basePath":"%s"}
                """.formatted("localhost", 8888, basePath);
    }

    private String buildDefaultSeaweedPublicUrl() {
        return "http://%s:%d%s".formatted(
                "localhost",
                8888,
                normalizeBasePath("/godotlaunch")
        );
    }

    private String normalizeBasePath(String path) {
        if (path == null || path.isBlank()) {
            return "/godotlaunch";
        }
        String normalized = path.startsWith("/") ? path : "/" + path;
        return normalized.replaceAll("/+$", "");
    }
}
