package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.AIRec;
import com.godotlaunch.backend.entity.enums.SecurityStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AIReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_version_id", nullable = false, unique = true)
    private GameVersion gameVersion;

    @Column(name = "quality_score")
    private Short qualityScore;

    @Column(name = "originality_score")
    private Short originalityScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "security_status", nullable = false, columnDefinition = "security_status_enum")
    private SecurityStatus securityStatus = SecurityStatus.clean;

    @Column(name = "trend_score")
    private Short trendScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "ai_rec_enum")
    private AIRec recommendation;

    @Column(name = "suggested_price", precision = 15, scale = 2)
    private BigDecimal suggestedPrice;

    @Column(name = "suggested_revenue_split")
    private Short suggestedRevenueSplit;

    @Column(name = "raw_result", columnDefinition = "jsonb")
    private String rawResult;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
