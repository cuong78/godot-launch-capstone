package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.UpdatePlatformSettingsRequest;
import com.godotlaunch.backend.dto.response.PlatformSettingsResponse;

import java.math.BigDecimal;

public interface PlatformSettingsService {

    PlatformSettingsResponse getPlatformSettings();

    PlatformSettingsResponse updatePlatformSettings(UpdatePlatformSettingsRequest request);

    BigDecimal getPlatformCommissionRate();
}
