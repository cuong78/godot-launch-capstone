package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.AiRecommendation;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "ai_review_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiReviewReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id")
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @Column(name = "code_quality_score")
    private Integer codeQualityScore;

    @Column(name = "media_match_score")
    private Integer mediaMatchScore;

    @Column(name = "description_match_score")
    private Integer descriptionMatchScore;

    @Column(name = "nsfw_flag", nullable = false)
    private boolean nsfwFlag = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_recommendation", nullable = false, length = 20)
    private AiRecommendation overallRecommendation = AiRecommendation.review;

    @Column(name = "suggested_price", precision = 15, scale = 2)
    private BigDecimal suggestedPrice;

    @Column(name = "suggested_revenue_split")
    private Short suggestedRevenueSplit;          // % chia doanh thu 0-100 (game co-publishing)

    @Column(name = "pricing_rationale", columnDefinition = "TEXT")
    private String pricingRationale;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "flags", columnDefinition = "jsonb")
    private String flags;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_output", columnDefinition = "jsonb")
    private String rawOutput;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
