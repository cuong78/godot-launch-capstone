package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class PlagiarismFlagResponse {
    private UUID id;
    private UUID gameId;
    private String gameTitle;
    private UUID matchedGameId;
    private String matchedGameTitle;
    private UUID sourceSnapshotId;
    private String sourceCommitSha;
    private UUID matchedSourceSnapshotId;
    private String matchedCommitSha;
    private UUID codeEmbeddingId;
    private UUID matchedCodeEmbeddingId;
    private Float similarityScore;
    private String severity;
    private String modelName;
    private String modelVersion;
    private Float reviewThreshold;
    private Float rejectThreshold;
    private boolean reviewedByAdmin;
    private Instant createdAt;
}
