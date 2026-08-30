package com.godotlaunch.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Trạng thái submit game lên store ngoài (mặc định Google Play) cho 1 GameVersion cụ thể.
 */
@Getter
@Builder
public class ExternalPublishResponse {
    private UUID id;
    private UUID gameId;
    private UUID gameVersionId;
    private String versionNumber;
    private String status;          // pending | submitted | live | rejected | removed
    private String externalAppId;
    private String storeUrl;
    private Instant submittedAt;
    private Instant liveAt;
    private String rejectedReason;
    private String provider;
    private String packageName;
    private Boolean reportingEnabled;
    private Instant publishedAt;
    private String mockRegistrationId;
    private Instant createdAt;
}
