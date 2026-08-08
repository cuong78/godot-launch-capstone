package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PlatformSettingsResponse {

    private BigDecimal commissionRate;
    private Short withdrawalHoldDays;
    private boolean maintenanceMode;
    private String announcementBanner;
    private Instant updatedAt;
}
