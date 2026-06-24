package com.godotlaunch.backend.config;

import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.StorageRouting;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.FileType;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.StorageRoutingRepository;
import com.godotlaunch.backend.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
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

    @Bean
    public ApplicationRunner initializer() {
        return args -> {
            initAdminUser();
            syncStorageRoutingFileTypes();
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
}
