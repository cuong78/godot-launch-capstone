package com.godotlaunch.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePlatformSettingsRequest {

    @NotNull(message = "Commission rate is required")
    @DecimalMin(value = "0.00", message = "Commission rate must be at least 0")
    @DecimalMax(value = "100.00", message = "Commission rate must not exceed 100")
    private BigDecimal commissionRate;

    @NotNull(message = "Withdrawal hold days is required")
    @Min(value = 0, message = "Withdrawal hold days must be at least 0")
    @Max(value = 30, message = "Withdrawal hold days must not exceed 30")
    private Short withdrawalHoldDays;

    @NotNull(message = "Refund deadline days is required")
    @Min(value = 1, message = "Refund deadline days must be at least 1")
    @Max(value = 30, message = "Refund deadline days must not exceed 30")
    private Short refundDeadlineDays;

    @NotNull(message = "Dispute ban threshold is required")
    @Min(value = 1, message = "Dispute ban threshold must be at least 1")
    @Max(value = 20, message = "Dispute ban threshold must not exceed 20")
    private Short disputeBanThreshold;

    @NotNull(message = "Daily maintenance time is required")
    private LocalTime dailyMaintenanceTime;

    @NotNull(message = "Maintenance mode is required")
    private Boolean maintenanceMode;

    @Size(max = 500, message = "Announcement banner must not exceed 500 characters")
    private String announcementBanner;
}
