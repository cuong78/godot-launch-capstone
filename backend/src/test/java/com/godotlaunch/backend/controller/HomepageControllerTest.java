package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.HomepageResponse;
import com.godotlaunch.backend.service.HomepageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HomepageControllerTest {

    @Mock
    private HomepageService homepageService;

    @InjectMocks
    private HomepageController controller;

    @Test
    @DisplayName("getHomepage_ShouldReturnSuccess")
    void getHomepage_ShouldReturnSuccess() {
        HomepageResponse responseDto = new HomepageResponse();
        when(homepageService.getHomepage()).thenReturn(responseDto);

        ResponseEntity<ApiResponse<HomepageResponse>> response = controller.getHomepage();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).isSameAs(responseDto);
    }
}
