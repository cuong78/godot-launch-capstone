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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ApplicationInitConfig {

    UserRepository userRepository;
    RoleRepository roleRepository;
    PasswordEncoder passwordEncoder;
    JdbcTemplate jdbcTemplate;

    @Bean
    public ApplicationRunner initializer() {
        return args -> {
            initAdminUser();
            initChatbotViews();
        };
    }

    private void initChatbotViews() {
        try {
            jdbcTemplate.execute("DROP VIEW IF EXISTS v_user_purchases CASCADE;");
            String updateViewSql = """
                CREATE VIEW v_user_purchases AS
                SELECT 
                    o.id::varchar AS order_id,
                    o.buyer_id::varchar AS buyer_id,
                    o.game_id::varchar AS game_id,
                    g.title AS game_title,
                    g.creator_id::varchar AS owner_id,
                    o.price_paid AS total_amount,
                    o.order_type::varchar AS order_status,
                    o.purchased_at AS purchase_date
                FROM orders o
                LEFT JOIN games g ON o.game_id = g.id;
            """;
            jdbcTemplate.execute(updateViewSql);
            log.info("Successfully recreated PostgreSQL view 'v_user_purchases' with game_title for AI Chatbot.");
        } catch (Exception e) {
            log.error("Failed to auto-update view v_user_purchases: {}", e.getMessage(), e);
        }
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
}
