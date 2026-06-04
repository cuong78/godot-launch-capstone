package com.godotlaunch.backend.config;

import com.godotlaunch.backend.entity.Role;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.RoleRepository;
import com.godotlaunch.backend.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ApplicationInitConfig {

    UserRepository userRepository;
    RoleRepository roleRepository;
    PasswordEncoder passwordEncoder;

    @Bean
    public ApplicationRunner initializer() {
        return args -> {
            String adminEmail = "admin@godotlaunch.com";
            
            // Check if default admin user exists
            if (userRepository.findByEmail(adminEmail).isPresent()) {
                log.info("Admin user already exists. Skipping initialization.");
                return;
            }

            // Fetch the admin role from database
            Role adminRole = roleRepository.findByName("admin")
                    .orElseThrow(() -> new RuntimeException("Role 'admin' not found in database. Make sure schema.sql has run."));

            // Initialize the default admin user
            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode("admin"));
            admin.setFullName("Platform Administrator");
            admin.setStatus("active");
            admin.setRole(adminRole);

            userRepository.save(admin);
            log.info("Admin user has been created with default password: admin");
        };
    }
}
