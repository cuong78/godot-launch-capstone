package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class GameReviewOverviewResponse {
    private UUID gameId;
    private String publishingType;
    private UUID sourceSnapshotId;
    private String commitSha;
    private String aiReviewStatus;
    private String aiReviewError;
    private Instant aiReviewCompletedAt;
    private String plagiarismStatus;
    private String plagiarismError;
    private Instant plagiarismCompletedAt;
    private AiReviewReportResponse report;
    private List<PlagiarismFlagResponse> plagiarismFlags;
}
