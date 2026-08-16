package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameEntitlementResponse {
    private boolean owned;
    private UUID purchaseId;
    private GameVersionSummaryResponse currentVersion;
    private GameVersionSummaryResponse lastDownloadedVersion;
    private DownloadState downloadState;
    private String downloadEndpoint;

    public enum DownloadState {
        NOT_OWNED,
        FIRST_DOWNLOAD_AVAILABLE,
        UPDATE_AVAILABLE,
        UP_TO_DATE,
        PACKAGE_UNAVAILABLE
    }
}
