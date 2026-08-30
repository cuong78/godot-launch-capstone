package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreDailyMetricResponse {
    private UUID id;
    private UUID externalPublishId;
    private UUID gameId;
    private String gameTitle;
    private String packageName;
    private LocalDate metricDate;
    private String countryCode;
    private Integer dailyUserInstalls;
}
