package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.PlagiarismSeverity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Kết quả phát hiện 2 game giống nhau bất thường (similarity > ngưỡng review).
 * AI chỉ đề xuất — admin luôn xem bằng chứng và quyết định cuối, không
 * auto-reject (xem docs/06-plagiarism-detection-plan.md mục 1.3).
 */
@Entity
@Table(name = "plagiarism_flags")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PlagiarismFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Game MỚI submit, bị nghi ngờ.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    // Game ĐÃ CÓ trong kho, giống với game trên.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "matched_game_id", nullable = false)
    private Game matchedGame;

    // Embedding của game MỚI được dùng trong phép so sánh.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "code_embedding_id", nullable = false)
    private CodeEmbedding codeEmbedding;

    // Embedding của game ĐÃ CÓ được dùng trong phép so sánh.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "matched_code_embedding_id", nullable = false)
    private CodeEmbedding matchedCodeEmbedding;

    // Lưu trực tiếp hai snapshot để audit/query mà không phụ thuộc vào join gián tiếp.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_snapshot_id", nullable = false)
    private SourceSnapshot sourceSnapshot;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "matched_source_snapshot_id", nullable = false)
    private SourceSnapshot matchedSourceSnapshot;

    @Column(name = "similarity_score", nullable = false)
    private Float similarityScore;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "model_version", nullable = false, length = 100)
    private String modelVersion;

    // Ngưỡng bắt đầu tạo flag REVIEW tại thời điểm phép so sánh được chạy.
    @Column(name = "review_threshold", nullable = false)
    private Float reviewThreshold;

    // Ngưỡng chuyển đề xuất từ REVIEW sang REJECT tại thời điểm chạy.
    @Column(name = "reject_threshold", nullable = false)
    private Float rejectThreshold;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private PlagiarismSeverity severity;

    @Column(name = "reviewed_by_admin", nullable = false)
    private boolean reviewedByAdmin = false;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
