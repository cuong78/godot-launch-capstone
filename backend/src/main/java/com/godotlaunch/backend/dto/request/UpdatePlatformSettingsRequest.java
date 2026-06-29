package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePlatformSettingsRequest {

    @NotNull(message = "Commission rate is required")
    @DecimalMin(value = "0.00", message = "Commission rate must be at least 0")
    @DecimalMax(value = "100.00", message = "Commission rate must not exceed 100")
    private BigDecimal commissionRate;

    @NotNull(message = "Maintenance mode is required")
    private Boolean maintenanceMode;

    @Size(max = 500, message = "Announcement banner must not exceed 500 characters")
    private String announcementBanner;
}
