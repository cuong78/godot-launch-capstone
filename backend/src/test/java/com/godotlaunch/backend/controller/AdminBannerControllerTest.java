package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateBannerRequest;
import com.godotlaunch.backend.dto.request.UpdateBannerRequest;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminBannerControllerTest {

    @Mock
    private BannerService bannerService;

    @InjectMocks
    private AdminBannerController controller;

    @Test
    @DisplayName("getAll_ShouldReturnSuccess")
    void getAll_ShouldReturnSuccess() {
        BannerResponse bannerResponse = new BannerResponse();
        when(bannerService.getAll()).thenReturn(List.of(bannerResponse));

        ResponseEntity<ApiResponse<List<BannerResponse>>> response = controller.getAll();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("create_ShouldReturnSuccess")
    void create_ShouldReturnSuccess() {
        CreateBannerRequest request = new CreateBannerRequest();
        BannerResponse bannerResponse = new BannerResponse();
        when(bannerService.create(request)).thenReturn(bannerResponse);

        ResponseEntity<ApiResponse<BannerResponse>> response = controller.create(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).isSameAs(bannerResponse);
    }

    @Test
    @DisplayName("update_ShouldReturnSuccess")
    void update_ShouldReturnSuccess() {
        UUID id = UUID.randomUUID();
        UpdateBannerRequest request = new UpdateBannerRequest();
        BannerResponse bannerResponse = new BannerResponse();
        when(bannerService.update(id, request)).thenReturn(bannerResponse);

        ResponseEntity<ApiResponse<BannerResponse>> response = controller.update(id, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).isSameAs(bannerResponse);
    }

    @Test
    @DisplayName("delete_ShouldReturnSuccess")
    void delete_ShouldReturnSuccess() {
        UUID id = UUID.randomUUID();
        doNothing().when(bannerService).delete(id);

        ResponseEntity<ApiResponse<Void>> response = controller.delete(id);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(bannerService, times(1)).delete(id);
    }

    @Test
    @DisplayName("uploadImage_ShouldReturnSuccess")
    void uploadImage_ShouldReturnSuccess() {
        MultipartFile file = mock(MultipartFile.class);
        String url = "http://seaweedfs/banner.png";
        when(bannerService.uploadImage(file)).thenReturn(url);

        ResponseEntity<ApiResponse<Map<String, String>>> response = controller.uploadImage(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("imageUrl")).isEqualTo(url);
    }
}
