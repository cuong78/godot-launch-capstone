package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.UpdatePlatformSettingsRequest;
import com.godotlaunch.backend.dto.response.PlatformSettingsResponse;
import com.godotlaunch.backend.entity.PlatformSettings;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.PlatformSettingsRepository;
import com.godotlaunch.backend.service.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class PlatformSettingsServiceImpl implements PlatformSettingsService {

    private static final short SETTINGS_ID = 1;
    private static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("10.00");
    private static final BigDecimal MAX_COMMISSION_RATE = new BigDecimal("100.00");
    private static final String DEFAULT_ANNOUNCEMENT = "GodotLaunch Matrix Engine Upgrade is complete!";

    private final PlatformSettingsRepository platformSettingsRepository;

    @Override
    @Transactional(readOnly = true)
    public PlatformSettingsResponse getPlatformSettings() {
        return platformSettingsRepository.findById(SETTINGS_ID)
                .map(this::mapToResponse)
                .orElseGet(this::buildDefaultResponse);
    }

    @Override
    @Transactional
    public PlatformSettingsResponse updatePlatformSettings(UpdatePlatformSettingsRequest request) {
        BigDecimal normalizedRate = normalizeCommissionRate(request.getCommissionRate());

        PlatformSettings settings = platformSettingsRepository.findById(SETTINGS_ID)
                .orElseGet(() -> {
                    PlatformSettings created = new PlatformSettings();
                    created.setId(SETTINGS_ID);
                    return created;
                });

        settings.setCommissionRate(normalizedRate);
        settings.setMaintenanceMode(Boolean.TRUE.equals(request.getMaintenanceMode()));
        settings.setAnnouncementBanner(normalizeAnnouncement(request.getAnnouncementBanner()));

        return mapToResponse(platformSettingsRepository.save(settings));
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getPlatformCommissionRate() {
        return platformSettingsRepository.findById(SETTINGS_ID)
                .map(PlatformSettings::getCommissionRate)
                .filter(rate -> rate != null)
                .orElse(DEFAULT_COMMISSION_RATE);
    }

    private PlatformSettingsResponse buildDefaultResponse() {
        return new PlatformSettingsResponse(
                DEFAULT_COMMISSION_RATE,
                false,
                DEFAULT_ANNOUNCEMENT,
                null
        );
    }

    private PlatformSettingsResponse mapToResponse(PlatformSettings settings) {
        return new PlatformSettingsResponse(
                settings.getCommissionRate() != null ? settings.getCommissionRate() : DEFAULT_COMMISSION_RATE,
                settings.isMaintenanceMode(),
                settings.getAnnouncementBanner(),
                settings.getUpdatedAt()
        );
    }

    private BigDecimal normalizeCommissionRate(BigDecimal commissionRate) {
        if (commissionRate == null
                || commissionRate.compareTo(BigDecimal.ZERO) < 0
                || commissionRate.compareTo(MAX_COMMISSION_RATE) > 0) {
            throw new AppException(ErrorCode.PLATFORM_COMMISSION_RATE_INVALID);
        }

        return commissionRate.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeAnnouncement(String announcementBanner) {
        if (!StringUtils.hasText(announcementBanner)) {
            return null;
        }
        return announcementBanner.trim();
    }
}
