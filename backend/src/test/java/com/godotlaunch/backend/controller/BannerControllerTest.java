package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.BannerResponse;
import com.godotlaunch.backend.service.BannerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BannerControllerTest {

    @Mock
    private BannerService bannerService;

    @InjectMocks
    private BannerController controller;

    @Test
    @DisplayName("getAll_ShouldReturnSuccess")
    void getAll_ShouldReturnSuccess() {
        BannerResponse bannerResponse = new BannerResponse();
        when(bannerService.getAll()).thenReturn(List.of(bannerResponse));

        ResponseEntity<ApiResponse<List<BannerResponse>>> response = controller.getAll();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }
}
