package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.ExternalPublishResponse;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.GameService;
import com.godotlaunch.backend.service.StorePublishService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminGameControllerTest {

    @Mock
    private GameService gameService;

    @Mock
    private StorePublishService storePublishService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AdminGameController adminGameController;

    private UUID gameId;
    private UUID adminId;

    @BeforeEach
    void setUp() {
        gameId = UUID.randomUUID();
        adminId = UUID.randomUUID();
    }

    @Test
    @DisplayName("shouldApproveGame_WhenValidId")
    void shouldApproveGame_WhenValidId() {
        // Arrange
        doNothing().when(gameService).approveGame(gameId);

        // Act
        ResponseEntity<ApiResponse<Void>> response = adminGameController.approveGame(gameId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getMessage()).contains("approved and published");
        verify(gameService, times(1)).approveGame(gameId);
    }

    @Test
    @DisplayName("shouldRejectGame_WhenReasonProvided")
    void shouldRejectGame_WhenReasonProvided() {
        // Arrange
        doNothing().when(gameService).rejectGame(gameId, "Inappropriate content");

        // Act
        ResponseEntity<ApiResponse<Void>> response = adminGameController.rejectGame(gameId, Map.of("reason", "Inappropriate content"));

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getMessage()).contains("rejected successfully");
        verify(gameService, times(1)).rejectGame(gameId, "Inappropriate content");
    }

    @Test
    @DisplayName("shouldUploadStoreBuild_WhenAdminAndFilesProvided")
    void shouldUploadStoreBuild_WhenAdminAndFilesProvided() {
        // Arrange
        MockMultipartFile buildFile = new MockMultipartFile("file", "game.apk", "application/vnd.android.package-archive", "apk content".getBytes());
        MockMultipartFile graphicFile = new MockMultipartFile("featureGraphic", "graphic.png", "image/png", "image content".getBytes());

        User adminUser = new User();
        adminUser.setId(adminId);
        adminUser.setEmail("admin@godotlaunch.dev");

        when(authentication.getName()).thenReturn("admin@godotlaunch.dev");
        when(userRepository.findByEmail("admin@godotlaunch.dev")).thenReturn(Optional.of(adminUser));

        ExternalPublishResponse externalResponse = ExternalPublishResponse.builder()
                .id(UUID.randomUUID())
                .gameId(gameId)
                .status("submitted")
                .build();

        when(storePublishService.uploadBuildAndPublish(
                eq(gameId), eq(buildFile), eq("1.0.1"), eq("Bug fixes"), eq("Fun game"), eq(graphicFile), eq(adminId)))
                .thenReturn(externalResponse);

        // Act
        ResponseEntity<ApiResponse<ExternalPublishResponse>> response = adminGameController.uploadStoreBuild(
                gameId, buildFile, "1.0.1", "Bug fixes", "Fun game", graphicFile, authentication);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getStatus()).isEqualTo("submitted");
        verify(storePublishService, times(1)).uploadBuildAndPublish(
                gameId, buildFile, "1.0.1", "Bug fixes", "Fun game", graphicFile, adminId);
    }

    @Test
    @DisplayName("shouldGetStorePublishStatus_WhenCalled")
    void shouldGetStorePublishStatus_WhenCalled() {
        // Arrange
        ExternalPublishResponse externalResponse = ExternalPublishResponse.builder()
                .id(UUID.randomUUID())
                .gameId(gameId)
                .status("live")
                .build();

        when(storePublishService.getLatestForGame(gameId)).thenReturn(externalResponse);

        // Act
        ResponseEntity<ApiResponse<ExternalPublishResponse>> response = adminGameController.getStorePublishStatus(gameId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getStatus()).isEqualTo("live");
        verify(storePublishService, times(1)).getLatestForGame(gameId);
    }
}
