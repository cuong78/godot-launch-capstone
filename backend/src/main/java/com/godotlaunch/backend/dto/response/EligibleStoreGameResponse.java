package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibleStoreGameResponse {
    private UUID gameId;
    private String gameTitle;
    private String gameStatus;
    private String creatorName;
    private String creatorEmail;
    private UUID externalPublishId;
    private String provider;
    private String packageName;
    private String publishStatus;
    private Boolean reportingEnabled;
    private Instant publishedAt;
    private Instant createdAt;
    private Long totalInstalls;
    private Boolean hasCoPublishingContract;
    private String contractType;
    private Short revenueSplit;
}
