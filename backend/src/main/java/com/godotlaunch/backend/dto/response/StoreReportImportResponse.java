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
public class StoreReportImportResponse {
    private UUID id;
    private String provider;
    private UUID externalPublishId;
    private String gameTitle;
    private String packageName;
    private String sourceObjectPath;
    private String reportMonth;
    private Instant syncedAt;
    private String rawFileUrl;
    private String fileChecksum;
    private Integer rowCount;
    private String status;
    private String errorMessage;
}
