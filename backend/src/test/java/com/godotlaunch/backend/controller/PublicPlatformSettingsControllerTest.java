package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.service.PlatformSettingsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicPlatformSettingsControllerTest {

    @Mock
    private PlatformSettingsService platformSettingsService;

    @InjectMocks
    private PublicPlatformSettingsController controller;

    @Test
    @DisplayName("getPublicSettings_ShouldReturnSuccess")
    void getPublicSettings_ShouldReturnSuccess() {
        when(platformSettingsService.getPlatformCommissionRate()).thenReturn(BigDecimal.TEN);

        ResponseEntity<ApiResponse<Map<String, BigDecimal>>> response = controller.getPublicSettings();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("commissionRate")).isEqualTo(BigDecimal.TEN);
    }
}
