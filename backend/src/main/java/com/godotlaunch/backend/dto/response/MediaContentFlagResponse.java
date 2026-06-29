package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class MediaContentFlagResponse {
    private UUID id;
    private String mediaUrl;
    private String mediaType;
    private String ownerType;
    private UUID ownerId;
    private String ownerName;
    private double nsfwScore;
    private boolean flagged;
    private String flagDetails;
    private String status;
    private String reviewerNote;
    private Instant reviewedAt;
    private Instant createdAt;
}
