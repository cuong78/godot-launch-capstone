package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class DisputeResponse {
    private UUID id;
    private UUID reporterId;
    private String reporterEmail;
    private UUID reportedSellerId;
    private String reportedSellerEmail;
    private UUID gameId;
    private String gameTitle;
    private String reason;
    private String evidenceRepoUrl;
    private String evidenceNote;
    private String status;
    private String resolutionNote;
    private BigDecimal refundAmount;
    private Instant refundDeadline;
    private Instant createdAt;
    private Instant resolvedAt;
}
