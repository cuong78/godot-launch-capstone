package com.godotlaunch.backend.util;

import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.repository.GameVersionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VersionUtilsTest {

    @Mock
    private GameVersionRepository gameVersionRepository;

    @Test
    @DisplayName("incrementVersion_ShouldReturnCorrectIncrements")
    void incrementVersion_ShouldReturnCorrectIncrements() {
        assertThat(VersionUtils.incrementVersion(null)).isEqualTo("1.0.0");
        assertThat(VersionUtils.incrementVersion("")).isEqualTo("1.0.0");
        assertThat(VersionUtils.incrementVersion("1.0.0")).isEqualTo("1.0.1");
        assertThat(VersionUtils.incrementVersion("2.3.11")).isEqualTo("2.3.12");
        assertThat(VersionUtils.incrementVersion("invalid")).isEqualTo("invalid.1");
    }

    @Test
    @DisplayName("updateGameVersionFile_ShouldCreateInitialVersion_WhenNoPreviousVersions")
    void updateGameVersionFile_ShouldCreateInitialVersion_WhenNoPreviousVersions() {
        Game game = new Game();
        game.setId(UUID.randomUUID());
        String fileUrl = "http://seaweedfs/game.zip";

        when(gameVersionRepository.findByGame_IdOrderByReleasedAtDesc(game.getId())).thenReturn(Collections.emptyList());

        VersionUtils.updateGameVersionFile(game, fileUrl, gameVersionRepository);

        ArgumentCaptor<GameVersion> versionCaptor = ArgumentCaptor.forClass(GameVersion.class);
        verify(gameVersionRepository, times(1)).save(versionCaptor.capture());

        GameVersion created = versionCaptor.getValue();
        assertThat(created.getVersionNumber()).isEqualTo("1.0.0");
        assertThat(created.getFileUrl()).isEqualTo(fileUrl);
        assertThat(created.isCurrent()).isTrue();
    }

    @Test
    @DisplayName("updateGameVersionFile_ShouldUpdateCurrentVersionFileUrl_WhenStatusIsDraft")
    void updateGameVersionFile_ShouldUpdateCurrentVersionFileUrl_WhenStatusIsDraft() {
        Game game = new Game();
        game.setId(UUID.randomUUID());
        game.setStatus(GameStatus.draft);
        String fileUrl = "http://seaweedfs/new_game.zip";

        GameVersion currentVersion = new GameVersion();
        currentVersion.setVersionNumber("1.0.0");
        currentVersion.setCurrent(true);
        currentVersion.setFileUrl("http://seaweedfs/old_game.zip");

        when(gameVersionRepository.findByGame_IdOrderByReleasedAtDesc(game.getId())).thenReturn(List.of(currentVersion));

        VersionUtils.updateGameVersionFile(game, fileUrl, gameVersionRepository);

        verify(gameVersionRepository, times(1)).save(currentVersion);
        assertThat(currentVersion.getFileUrl()).isEqualTo(fileUrl);
    }

    @Test
    @DisplayName("updateGameVersionFile_ShouldIncrementVersionAndDeactivatePrevious_WhenStatusIsPublished")
    void updateGameVersionFile_ShouldIncrementVersionAndDeactivatePrevious_WhenStatusIsPublished() {
        Game game = new Game();
        game.setId(UUID.randomUUID());
        game.setStatus(GameStatus.published);
        String fileUrl = "http://seaweedfs/update_game.zip";

        GameVersion currentVersion = new GameVersion();
        currentVersion.setVersionNumber("1.0.0");
        currentVersion.setCurrent(true);
        currentVersion.setFileUrl("http://seaweedfs/old_game.zip");

        List<GameVersion> versions = new ArrayList<>();
        versions.add(currentVersion);

        when(gameVersionRepository.findByGame_IdOrderByReleasedAtDesc(game.getId())).thenReturn(versions);

        VersionUtils.updateGameVersionFile(game, fileUrl, gameVersionRepository);

        // Deactivated old
        verify(gameVersionRepository).save(currentVersion);
        assertThat(currentVersion.isCurrent()).isFalse();

        // Created new
        ArgumentCaptor<GameVersion> newVersionCaptor = ArgumentCaptor.forClass(GameVersion.class);
        verify(gameVersionRepository, times(2)).save(newVersionCaptor.capture());

        List<GameVersion> savedList = newVersionCaptor.getAllValues();
        GameVersion newVer = savedList.get(savedList.size() - 1);
        assertThat(newVer.getVersionNumber()).isEqualTo("1.0.1");
        assertThat(newVer.getFileUrl()).isEqualTo(fileUrl);
        assertThat(newVer.isCurrent()).isTrue();
    }
}
