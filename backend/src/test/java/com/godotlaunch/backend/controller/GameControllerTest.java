package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateGameRequest;
import com.godotlaunch.backend.dto.request.SubmitGameRepoRequest;
import com.godotlaunch.backend.dto.request.UpdateGameRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.service.GameService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
import org.springframework.web.servlet.HandlerMapping;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameControllerTest {

    @Mock
    private GameService gameService;

    @Mock
    private Principal principal;

    @Mock
    private HttpServletRequest httpServletRequest;

    @Mock
    private HttpServletResponse httpServletResponse;

    @InjectMocks
    private GameController gameController;

    private UUID gameId;
    private String userEmail;

    @BeforeEach
    void setUp() {
        gameId = UUID.randomUUID();
        userEmail = "developer@godotlaunch.dev";
    }

    @Test
    @DisplayName("shouldCreateGameDraft_WhenValidRequest")
    void shouldCreateGameDraft_WhenValidRequest() {
        // Arrange
        CreateGameRequest request = new CreateGameRequest();
        request.setTitle("Space Shooter");
        when(principal.getName()).thenReturn(userEmail);
        when(gameService.createGameDraft(any(CreateGameRequest.class), eq(userEmail))).thenReturn(gameId);

        // Act
        ResponseEntity<ApiResponse<Map<String, UUID>>> response = gameController.createGameDraft(request, principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).containsEntry("gameId", gameId);
        verify(gameService, times(1)).createGameDraft(request, userEmail);
    }

    @Test
    @DisplayName("shouldSubmitGameRepo_WhenValidRequest")
    void shouldSubmitGameRepo_WhenValidRequest() {
        // Arrange
        SubmitGameRepoRequest request = new SubmitGameRepoRequest();
        request.setRepoUrl("https://github.com/user/space-shooter");
        request.setBranch("main");
        when(principal.getName()).thenReturn(userEmail);
        doNothing().when(gameService).submitGameRepo(gameId, request.getRepoUrl(), request.getBranch(), userEmail);

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> response = gameController.submitGameRepo(gameId, request, principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().get("message")).contains("submit thành công");
        verify(gameService, times(1)).submitGameRepo(gameId, request.getRepoUrl(), request.getBranch(), userEmail);
    }

    @Test
    @DisplayName("shouldGetGithubBot_WhenCalled")
    void shouldGetGithubBot_WhenCalled() {
        // Arrange
        when(gameService.getBotUsername()).thenReturn("godot-launch-bot");

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> response = gameController.getGithubBot();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).containsEntry("botUsername", "godot-launch-bot");
        verify(gameService, times(1)).getBotUsername();
    }

    @Test
    @DisplayName("shouldAcceptBot_WhenInvitationGranted")
    void shouldAcceptBot_WhenInvitationGranted() {
        // Arrange
        SubmitGameRepoRequest request = new SubmitGameRepoRequest();
        request.setRepoUrl("https://github.com/user/private-repo");
        when(principal.getName()).thenReturn(userEmail);
        when(gameService.acceptBotInvitation(request.getRepoUrl(), userEmail)).thenReturn(true);

        // Act
        ResponseEntity<ApiResponse<Map<String, Boolean>>> response = gameController.acceptBot(request, principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).containsEntry("granted", true);
        verify(gameService, times(1)).acceptBotInvitation(request.getRepoUrl(), userEmail);
    }

    @Test
    @DisplayName("shouldGetAllGames_WhenStatusProvidedOrNull")
    void shouldGetAllGames_WhenStatusProvidedOrNull() {
        // Arrange
        GameResponse gameResponse = GameResponse.builder().id(gameId).title("Platformer").build();
        when(gameService.getGamesByStatus(GameStatus.published)).thenReturn(List.of(gameResponse));
        when(gameService.getAllGames()).thenReturn(List.of(gameResponse));

        // Act - with status
        ResponseEntity<ApiResponse<List<GameResponse>>> filtered = gameController.getAllGames(GameStatus.published, null);
        // Act - without status
        ResponseEntity<ApiResponse<List<GameResponse>>> all = gameController.getAllGames(null, null);

        // Assert
        assertThat(filtered.getBody().getData()).hasSize(1);
        assertThat(all.getBody().getData()).hasSize(1);
        verify(gameService, times(1)).getGamesByStatus(GameStatus.published);
        verify(gameService, times(1)).getAllGames();
    }

    @Test
    @DisplayName("shouldGetGameById_WhenGameExists")
    void shouldGetGameById_WhenGameExists() {
        // Arrange
        GameResponse gameResponse = GameResponse.builder().id(gameId).title("RTS Game").build();
        when(gameService.getGameById(gameId)).thenReturn(gameResponse);

        // Act
        ResponseEntity<ApiResponse<GameResponse>> response = gameController.getGameById(gameId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getTitle()).isEqualTo("RTS Game");
        verify(gameService, times(1)).getGameById(gameId);
    }

    @Test
    @DisplayName("shouldUpdateGame_WhenValidRequest")
    void shouldUpdateGame_WhenValidRequest() {
        // Arrange
        UpdateGameRequest request = new UpdateGameRequest();
        request.setTitle("Updated Title");
        GameResponse gameResponse = GameResponse.builder().id(gameId).title("Updated Title").build();

        when(principal.getName()).thenReturn(userEmail);
        when(gameService.updateGame(gameId, request, userEmail)).thenReturn(gameResponse);

        // Act
        ResponseEntity<ApiResponse<GameResponse>> response = gameController.updateGame(gameId, request, principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().getTitle()).isEqualTo("Updated Title");
        verify(gameService, times(1)).updateGame(gameId, request, userEmail);
    }

    @Test
    @DisplayName("shouldGetUploadUrl_WhenRequested")
    void shouldGetUploadUrl_WhenRequested() {
        // Arrange
        String presignedUrl = "http://storage.local/upload-presigned";
        when(principal.getName()).thenReturn(userEmail);
        when(gameService.getPresignedUploadUrl(gameId, "thumbnail", "image/png", userEmail)).thenReturn(presignedUrl);

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> response = gameController.getUploadUrl(gameId, "thumbnail", "image/png", principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).containsEntry("uploadUrl", presignedUrl);
        verify(gameService, times(1)).getPresignedUploadUrl(gameId, "thumbnail", "image/png", userEmail);
    }

    @Test
    @DisplayName("shouldConfirmUploadComplete_WhenFileTypeThumbnail")
    void shouldConfirmUploadComplete_WhenFileTypeThumbnail() {
        // Arrange
        when(principal.getName()).thenReturn(userEmail);
        doNothing().when(gameService).confirmUploadComplete(gameId, "thumbnail", "key123", userEmail);

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> response = gameController.confirmUploadComplete(gameId, "thumbnail", "key123", principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("message")).isEqualTo("Thumbnail uploaded successfully");
        verify(gameService, times(1)).confirmUploadComplete(gameId, "thumbnail", "key123", userEmail);
    }

    @Test
    @DisplayName("shouldUploadGameMedia_WhenMultipartFileProvided")
    void shouldUploadGameMedia_WhenMultipartFileProvided() {
        // Arrange
        MockMultipartFile file = new MockMultipartFile("file", "screenshot.png", "image/png", "dummy".getBytes());
        when(principal.getName()).thenReturn(userEmail);
        when(gameService.uploadGameMedia(gameId, "screenshot", file, userEmail)).thenReturn("games/key123");

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> response = gameController.uploadGameMedia(gameId, file, "screenshot", principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).containsEntry("objectKey", "games/key123");
        verify(gameService, times(1)).uploadGameMedia(gameId, "screenshot", file, userEmail);
    }

    @Test
    @DisplayName("shouldClearGameMedia_WhenRequested")
    void shouldClearGameMedia_WhenRequested() {
        // Arrange
        when(principal.getName()).thenReturn(userEmail);
        doNothing().when(gameService).clearGameMedia(gameId, "image", userEmail);

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> response = gameController.clearGameMedia(gameId, "image", principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(gameService, times(1)).clearGameMedia(gameId, "image", userEmail);
    }

    @Test
    @DisplayName("shouldDeleteGameMediaItem_WhenMediaUrlProvided")
    void shouldDeleteGameMediaItem_WhenMediaUrlProvided() {
        // Arrange
        String mediaUrl = "http://storage.local/media/img.png";
        when(principal.getName()).thenReturn(userEmail);
        doNothing().when(gameService).deleteGameMediaByUrl(gameId, mediaUrl, userEmail);

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> response = gameController.deleteGameMediaItem(gameId, mediaUrl, principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(gameService, times(1)).deleteGameMediaByUrl(gameId, mediaUrl, userEmail);
    }

    @Test
    @DisplayName("shouldUploadWebDemo_WhenFileProvided")
    void shouldUploadWebDemo_WhenFileProvided() {
        // Arrange
        MockMultipartFile file = new MockMultipartFile("file", "demo.zip", "application/zip", "demo content".getBytes());
        when(principal.getName()).thenReturn(userEmail);
        doNothing().when(gameService).uploadWebDemo(gameId, file, userEmail);

        // Act
        ResponseEntity<ApiResponse<Map<String, String>>> response = gameController.uploadWebDemo(gameId, file, principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData().get("message")).contains("uploaded and activated");
        verify(gameService, times(1)).uploadWebDemo(gameId, file, userEmail);
    }

    @Test
    @DisplayName("shouldServeWebDemo_WhenFileRequested")
    void shouldServeWebDemo_WhenFileRequested() throws Exception {
        // Arrange
        when(httpServletRequest.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE))
                .thenReturn("/api/v1/games/" + gameId + "/web-demo/index.html");
        when(httpServletRequest.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE))
                .thenReturn("/api/v1/games/{id}/web-demo/**");
        doNothing().when(gameService).streamWebDemoFile(eq(gameId), eq("index.html"), eq(httpServletResponse));

        // Act
        gameController.serveWebDemo(gameId, httpServletRequest, httpServletResponse);

        // Assert
        verify(gameService, times(1)).streamWebDemoFile(gameId, "index.html", httpServletResponse);
    }
}
