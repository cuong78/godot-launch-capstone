package com.godotlaunch.backend.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * AI review report cho admin xem (điểm + flags + bằng chứng).
 * flags/rawOutput trả dạng JsonNode để frontend render trực tiếp.
 */
@Getter
@Builder
public class AiReviewReportResponse {
    private UUID id;
    private UUID gameId;
    private UUID assetId;
    private UUID sourceSnapshotId;
    private String commitSha;

    private Integer codeQualityScore;
    private Integer mediaMatchScore;
    private Integer descriptionMatchScore;
    private Integer tagsMatchScore;
    private boolean nsfwFlag;

    private String overallRecommendation;   // approve | review | reject

    // khuyến nghị giá (đề xuất, admin quyết định)
    private BigDecimal suggestedPrice;
    private Short suggestedRevenueSplit;     // % chia doanh thu 0-100
    private String pricingRationale;

    private JsonNode flags;                 // [{type, severity, detail, evidenceIndex?}]
    private JsonNode rawOutput;             // output thô từng module (debug)

    private Instant createdAt;
}
