package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.request.UpdatePlatformSettingsRequest;
import com.godotlaunch.backend.dto.response.PlatformSettingsResponse;
import com.godotlaunch.backend.entity.PlatformSettings;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.PlatformSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlatformSettingsServiceImplTest {

    @Mock
    private PlatformSettingsRepository platformSettingsRepository;

    @InjectMocks
    private PlatformSettingsServiceImpl platformSettingsService;

    private PlatformSettings settings;

    @BeforeEach
    void setUp() {
        settings = new PlatformSettings();
        settings.setId((short) 1);
        settings.setCommissionRate(new BigDecimal("10.00"));
        settings.setMaintenanceMode(false);
        settings.setAnnouncementBanner("Default banner");
    }

    @Test
    @DisplayName("shouldGetPlatformSettings_WhenRecordExists")
    void shouldGetPlatformSettings_WhenRecordExists() {
        // Arrange
        when(platformSettingsRepository.findById((short) 1)).thenReturn(Optional.of(settings));

        // Act
        PlatformSettingsResponse response = platformSettingsService.getPlatformSettings();

        // Assert
        assertThat(response.getCommissionRate()).isEqualTo(new BigDecimal("10.00"));
        assertThat(response.isMaintenanceMode()).isFalse();
    }

    @Test
    @DisplayName("shouldGetDefaultPlatformSettings_WhenRecordMissing")
    void shouldGetDefaultPlatformSettings_WhenRecordMissing() {
        // Arrange
        when(platformSettingsRepository.findById((short) 1)).thenReturn(Optional.empty());

        // Act
        PlatformSettingsResponse response = platformSettingsService.getPlatformSettings();

        // Assert
        assertThat(response.getCommissionRate()).isEqualTo(new BigDecimal("10.00"));
        assertThat(response.getAnnouncementBanner()).contains("Upgrade is complete");
    }

    @Test
    @DisplayName("shouldUpdatePlatformSettings_WhenValidCommissionRate")
    void shouldUpdatePlatformSettings_WhenValidCommissionRate() {
        // Arrange
        UpdatePlatformSettingsRequest request = new UpdatePlatformSettingsRequest();
        request.setCommissionRate(new BigDecimal("12.50"));
        request.setWithdrawalHoldDays((short) 5);
        request.setRefundDeadlineDays((short) 5);
        request.setMaintenanceMode(true);
        request.setAnnouncementBanner("  Scheduled maintenance  ");

        when(platformSettingsRepository.findById((short) 1)).thenReturn(Optional.of(settings));
        when(platformSettingsRepository.save(any(PlatformSettings.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        PlatformSettingsResponse response = platformSettingsService.updatePlatformSettings(request);

        // Assert
        assertThat(response.getCommissionRate()).isEqualTo(new BigDecimal("12.50"));
        assertThat(response.isMaintenanceMode()).isTrue();
        assertThat(response.getAnnouncementBanner()).isEqualTo("Scheduled maintenance");
        verify(platformSettingsRepository, times(1)).save(any(PlatformSettings.class));
    }

    @Test
    @DisplayName("shouldThrowException_WhenInvalidCommissionRateNegativeOrTooHigh")
    void shouldThrowException_WhenInvalidCommissionRateNegativeOrTooHigh() {
        // Arrange
        UpdatePlatformSettingsRequest invalidRequest = new UpdatePlatformSettingsRequest();
        invalidRequest.setCommissionRate(new BigDecimal("-5.00"));

        // Act & Assert
        assertThatThrownBy(() -> platformSettingsService.updatePlatformSettings(invalidRequest))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PLATFORM_COMMISSION_RATE_INVALID);

        verify(platformSettingsRepository, never()).save(any());
    }

    @Test
    @DisplayName("shouldGetPlatformCommissionRate_FallbackToDefault")
    void shouldGetPlatformCommissionRate_FallbackToDefault() {
        // Arrange
        when(platformSettingsRepository.findById((short) 1)).thenReturn(Optional.empty());

        // Act
        BigDecimal rate = platformSettingsService.getPlatformCommissionRate();

        // Assert
        assertThat(rate).isEqualTo(new BigDecimal("10.00"));
    }
}
