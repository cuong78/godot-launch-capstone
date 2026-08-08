package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.UpdatePlatformSettingsRequest;
import com.godotlaunch.backend.dto.response.PlatformSettingsResponse;

import java.math.BigDecimal;
import java.time.LocalTime;

public interface PlatformSettingsService {

    PlatformSettingsResponse getPlatformSettings();

    PlatformSettingsResponse updatePlatformSettings(UpdatePlatformSettingsRequest request);

    BigDecimal getPlatformCommissionRate();

    short getWithdrawalHoldDays();

    short getRefundDeadlineDays();

    LocalTime getDailyMaintenanceTime();
}
