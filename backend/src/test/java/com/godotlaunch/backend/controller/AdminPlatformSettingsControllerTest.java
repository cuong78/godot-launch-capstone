package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.UpdatePlatformSettingsRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.PlatformSettingsResponse;
import com.godotlaunch.backend.service.PlatformSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminPlatformSettingsControllerTest {

    @Mock
    private PlatformSettingsService platformSettingsService;

    @InjectMocks
    private AdminPlatformSettingsController adminPlatformSettingsController;

    private PlatformSettingsResponse settingsResponse;

    @BeforeEach
    void setUp() {
        settingsResponse = new PlatformSettingsResponse(
                new BigDecimal("10.00"),
                (short) 5,
                (short) 5,
                false,
                "Welcome to Godot Launch!",
                null
        );
    }

    @Test
    @DisplayName("shouldGetPlatformSettings_WhenCalled")
    void shouldGetPlatformSettings_WhenCalled() {
        // Arrange
        when(platformSettingsService.getPlatformSettings()).thenReturn(settingsResponse);

        // Act
        ResponseEntity<ApiResponse<PlatformSettingsResponse>> response = adminPlatformSettingsController.getPlatformSettings();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getCommissionRate()).isEqualTo(new BigDecimal("10.00"));
        verify(platformSettingsService, times(1)).getPlatformSettings();
    }

    @Test
    @DisplayName("shouldUpdatePlatformSettings_WhenValidRequest")
    void shouldUpdatePlatformSettings_WhenValidRequest() {
        // Arrange
        UpdatePlatformSettingsRequest request = new UpdatePlatformSettingsRequest();
        request.setCommissionRate(new BigDecimal("15.00"));
        request.setMaintenanceMode(true);
        request.setAnnouncementBanner("Maintenance starting soon");

        PlatformSettingsResponse updatedResponse = new PlatformSettingsResponse(
                new BigDecimal("15.00"),
                (short) 5,
                (short) 5,
                true,
                "Maintenance starting soon",
                null
        );

        when(platformSettingsService.updatePlatformSettings(any(UpdatePlatformSettingsRequest.class))).thenReturn(updatedResponse);

        // Act
        ResponseEntity<ApiResponse<PlatformSettingsResponse>> response = adminPlatformSettingsController.updatePlatformSettings(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getCommissionRate()).isEqualTo(new BigDecimal("15.00"));
        assertThat(response.getBody().getData().isMaintenanceMode()).isTrue();
        verify(platformSettingsService, times(1)).updatePlatformSettings(request);
    }
}
