package com.godotlaunch.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Array;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Vector đại diện cho source code của 1 lần submit game (CodeBERT hoặc tương
 * đương) — dùng để so cosine similarity với toàn bộ kho, phát hiện đạo nhái
 * chủ động (khác SourceCommit: chỉ dựng lại bằng chứng SAU KHI có Dispute).
 * Không unique theo game — mỗi lần re-submit tạo một SourceSnapshot mới và có
 * embedding riêng. Model/version được lưu cùng vector để có thể tái hiện chính
 * xác kết quả so sánh khi model được nâng cấp.
 * Tách bảng riêng (giống FaceEmbedding) vì cần index ivfflat chuyên cho
 * tìm kiếm cosine similarity.
 */
@Entity
@Table(name = "code_embeddings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CodeEmbedding {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    /** Snapshot bất biến đã được dùng để sinh vector này. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_snapshot_id", nullable = false)
    private SourceSnapshot sourceSnapshot;

    @JdbcTypeCode(SqlTypes.VECTOR)
    @Array(length = 768)
    @Column(name = "embedding", nullable = false, columnDefinition = "vector(768)")
    private float[] embedding;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "model_version", nullable = false, length = 100)
    private String modelVersion;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
