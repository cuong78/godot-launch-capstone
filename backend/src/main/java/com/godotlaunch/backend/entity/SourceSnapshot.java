package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Bản chụp bất biến source code mỗi lần submit game — lưu trữ bundle + kết quả kiểm duyệt an toàn
 * (virus scan, secret leak, đúng project Godot). Mỗi lần submit tạo 1 row mới, không ghi đè.
 */
@Entity
@Table(name = "source_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SourceSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id")
    private Game game;

    @Column(name = "bundle_hash", length = 64, nullable = false)
    private String bundleHash;

    @Column(name = "is_godot_project", nullable = false)
    private boolean isGodotProject = false;

    @Column(name = "virus_clean", nullable = false)
    private boolean virusClean = true;

    @Column(name = "virus_scanned", nullable = false)
    private boolean virusScanned = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "secrets_found", columnDefinition = "jsonb")
    private String secretsFound;

    // Link source code đã zip lên storage (AI đọc lại + admin/người mua tải)
    @Column(name = "bundle_url", columnDefinition = "TEXT")
    private String bundleUrl;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
