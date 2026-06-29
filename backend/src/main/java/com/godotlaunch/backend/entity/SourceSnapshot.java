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
 * Bằng chứng bất biến mỗi lần submit code (game / marketplace source_code).
 * Lưu commit SHA + hash toàn bộ source để due diligence + phán xử tranh chấp.
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;

    @Column(name = "repo_url", columnDefinition = "TEXT", nullable = false)
    private String repoUrl;

    @Column(name = "commit_sha", length = 40)
    private String commitSha;

    @Column(name = "bundle_hash", length = 64, nullable = false)
    private String bundleHash;

    @Column(name = "file_count", nullable = false)
    private Integer fileCount = 0;

    @Column(name = "is_godot_project", nullable = false)
    private boolean isGodotProject = false;

    @Column(name = "virus_clean", nullable = false)
    private boolean virusClean = true;

    @Column(name = "virus_scanned", nullable = false)
    private boolean virusScanned = false;

    // JSONB lưu dạng text — serialize/deserialize bằng Jackson ở tầng service khi cần
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "file_hashes", columnDefinition = "jsonb")
    private String fileHashes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "secrets_found", columnDefinition = "jsonb")
    private String secretsFound;

    // Link source code đã zip lên storage (AI đọc lại + admin/người mua tải)
    @Column(name = "bundle_url", columnDefinition = "TEXT")
    private String bundleUrl;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
