package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.ExternalPublish;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.enums.ExtStatus;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.repository.ExternalPublishRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.service.GooglePlayPublishService;
import com.godotlaunch.backend.service.SeaweedFsService;
import com.godotlaunch.backend.dto.response.ExternalPublishResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StorePublishServiceImplTest {

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameVersionRepository gameVersionRepository;

    @Mock
    private ExternalPublishRepository externalPublishRepository;

    @Mock
    private MediaRepository mediaRepository;

    @Mock
    private SeaweedFsService seaweedFsService;

    @Mock
    private GooglePlayPublishService googlePlayPublishService;

    @InjectMocks
    private StorePublishServiceImpl storePublishService;

    private UUID gameId;
    private UUID adminId;
    private Game game;

    @BeforeEach
    void setUp() {
        gameId = UUID.randomUUID();
        adminId = UUID.randomUUID();

        game = new Game();
        game.setId(gameId);
        game.setTitle("Godot Battle");
        game.setStatus(GameStatus.awaiting_store_build);
        game.setThumbnailUrl("http://storage.local/thumb.png");
    }

    @Test
    @DisplayName("shouldThrowException_WhenGameNotFound")
    void shouldThrowException_WhenGameNotFound() {
        // Arrange
        when(gameRepository.findById(gameId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> storePublishService.uploadBuildAndPublish(
                gameId, null, "1.0.0", "notes", "short desc", null, adminId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Game not found");
    }

    @Test
    @DisplayName("shouldThrowException_WhenGameStatusNotAwaitingStoreBuild")
    void shouldThrowException_WhenGameStatusNotAwaitingStoreBuild() {
        // Arrange
        game.setStatus(GameStatus.draft);
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        // Act & Assert
        assertThatThrownBy(() -> storePublishService.uploadBuildAndPublish(
                gameId, null, "1.0.0", "notes", "short desc", null, adminId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("chưa sẵn sàng upload build");
    }

    @Test
    @DisplayName("shouldThrowException_WhenFileBuildNullOrEmpty")
    void shouldThrowException_WhenFileBuildNullOrEmpty() {
        // Arrange
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        // Act & Assert
        assertThatThrownBy(() -> storePublishService.uploadBuildAndPublish(
                gameId, null, "1.0.0", "notes", "short desc", null, adminId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("File build (APK/AAB) là bắt buộc");
    }

    @Test
    @DisplayName("shouldThrowException_WhenShortDescriptionTooLong")
    void shouldThrowException_WhenShortDescriptionTooLong() {
        // Arrange
        MockMultipartFile buildFile = new MockMultipartFile("file", "game.apk", "application/octet-stream", "content".getBytes());
        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));

        String longDesc = "a".repeat(81);

        // Act & Assert
        assertThatThrownBy(() -> storePublishService.uploadBuildAndPublish(
                gameId, buildFile, "1.0.0", "notes", longDesc, null, adminId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Short description tối đa 80 ký tự");
    }

    @Test
    @DisplayName("shouldUploadBuildAndPublish_WhenAllInputsValid")
    void shouldUploadBuildAndPublish_WhenAllInputsValid() {
        // Arrange
        MockMultipartFile buildFile = new MockMultipartFile("file", "game.apk", "application/octet-stream", "apk bytes".getBytes());
        MockMultipartFile graphicFile = new MockMultipartFile("featureGraphic", "graphic.png", "image/png", "png bytes".getBytes());

        Media m1 = new Media(); m1.setMediaUrl("http://storage.local/s1.png");
        Media m2 = new Media(); m2.setMediaUrl("http://storage.local/s2.png");

        when(gameRepository.findById(gameId)).thenReturn(Optional.of(game));
        when(gameVersionRepository.findByGame_IdAndVersionNumber(gameId, "1.0.0")).thenReturn(Optional.empty());
        when(mediaRepository.findByGame_IdAndMediaType(gameId, "image")).thenReturn(List.of(m1, m2));
        when(seaweedFsService.uploadFile(eq(graphicFile), anyString())).thenReturn("http://storage.local/graphic.png");
        when(seaweedFsService.uploadFile(eq(buildFile), anyString())).thenReturn("http://storage.local/build.apk");
        when(gameVersionRepository.findByGame_IdAndIsCurrentTrue(gameId)).thenReturn(Optional.empty());
        when(gameVersionRepository.save(any(GameVersion.class))).thenAnswer(i -> i.getArgument(0));

        ExternalPublish extPublish = new ExternalPublish();
        extPublish.setId(UUID.randomUUID());
        extPublish.setGame(game);
        extPublish.setStatus(ExtStatus.submitted);

        when(googlePlayPublishService.publishGameToStore(any(GameVersion.class), eq("Fun game"), eq("http://storage.local/graphic.png"), anyList()))
                .thenReturn(extPublish);

        // Act
        ExternalPublishResponse response = storePublishService.uploadBuildAndPublish(
                gameId, buildFile, "1.0.0", "Initial build", "Fun game", graphicFile, adminId);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("submitted");
        verify(googlePlayPublishService, times(1)).publishGameToStore(any(GameVersion.class), eq("Fun game"), anyString(), anyList());
    }

    @Test
    @DisplayName("shouldGetLatestForGame_WhenPublishRecordExists")
    void shouldGetLatestForGame_WhenPublishRecordExists() {
        // Arrange
        GameVersion gv = new GameVersion();
        gv.setId(UUID.randomUUID());
        gv.setVersionNumber("1.0.0");

        ExternalPublish extPublish = new ExternalPublish();
        extPublish.setId(UUID.randomUUID());
        extPublish.setGame(game);
        extPublish.setGameVersion(gv);
        extPublish.setStatus(ExtStatus.live);

        when(externalPublishRepository.findFirstByGame_IdOrderByCreatedAtDesc(gameId))
                .thenReturn(Optional.of(extPublish));

        // Act
        ExternalPublishResponse response = storePublishService.getLatestForGame(gameId);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("live");
        assertThat(response.getVersionNumber()).isEqualTo("1.0.0");
    }
}
