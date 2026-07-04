package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.ContextMatchStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * 1 commit trong lịch sử repo của game — ghi nhận NGAY lúc push, chỉ mã commit + timestamp (rẻ).
 * KHÔNG pull code, KHÔNG chấm AI ở đây. Chỉ khi có Dispute, hệ thống mới pull code
 * về đúng commitSha này (codeSnapshotUrl) và cho AI đối chiếu với mô tả/hình ảnh/video
 * game đã khai báo, dựng lại timeline thật để admin xét xử.
 */
@Entity
@Table(name = "source_commits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SourceCommit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "commit_sha", nullable = false, length = 40)
    private String commitSha;

    @Column(name = "commit_pushed_at")
    private Instant commitPushedAt;

    // NULL cho tới khi có dispute — lúc đó mới pull code về đúng commitSha và lưu lại đây
    @Column(name = "code_snapshot_url", columnDefinition = "TEXT")
    private String codeSnapshotUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "context_match_status", nullable = false, length = 20)
    private ContextMatchStatus contextMatchStatus = ContextMatchStatus.pending;

    @Column(name = "ai_note", columnDefinition = "TEXT")
    private String aiNote;

    @Column(name = "ai_evaluated_at")
    private Instant aiEvaluatedAt;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
