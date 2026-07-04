package com.godotlaunch.backend.entity;

import com.pgvector.PGvector;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Vector đại diện cho source code của 1 lần submit game (CodeBERT hoặc tương
 * đương) — dùng để so cosine similarity với toàn bộ kho, phát hiện đạo nhái
 * chủ động (khác SourceCommit: chỉ dựng lại bằng chứng SAU KHI có Dispute).
 * Không unique theo game — mỗi lần re-submit là 1 embedding mới, giữ lịch sử.
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

    @Column(name = "embedding", nullable = false, columnDefinition = "vector(768)")
    private PGvector embedding;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
