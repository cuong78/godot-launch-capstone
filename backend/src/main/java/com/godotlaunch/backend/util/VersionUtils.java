package com.godotlaunch.backend.util;

import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.repository.GameVersionRepository;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Slf4j
public class VersionUtils {

    public static String incrementVersion(String currentVersion) {
        if (currentVersion == null || currentVersion.isBlank()) {
            return "1.0.0";
        }
        String[] parts = currentVersion.split("\\.");
        if (parts.length > 0) {
            try {
                int lastIdx = parts.length - 1;
                int lastNum = Integer.parseInt(parts[lastIdx]);
                parts[lastIdx] = String.valueOf(lastNum + 1);
                return String.join(".", parts);
            } catch (NumberFormatException e) {
                return currentVersion + ".1";
            }
        }
        return "1.0.0";
    }

    public static void updateGameVersionFile(Game game, String fileUrl, GameVersionRepository gameVersionRepository) {
        List<GameVersion> versions = gameVersionRepository.findByGame_IdOrderByReleasedAtDesc(game.getId());
        if (versions.isEmpty()) {
            // First time, create version 1.0.0
            GameVersion newVer = new GameVersion();
            newVer.setGame(game);
            newVer.setVersionNumber("1.0.0");
            newVer.setChangelog("Initial version");
            newVer.setFileUrl(fileUrl);
            newVer.setCurrent(true);
            gameVersionRepository.save(newVer);
            log.info("Created initial game version 1.0.0 for game: {}", game.getId());
        } else {
            GameVersion currentVer = versions.stream()
                    .filter(GameVersion::isCurrent)
                    .findFirst()
                    .orElse(versions.get(0));

            if (game.getStatus() == GameStatus.published || game.getStatus() == GameStatus.approved) {
                // Deactivate previous current version
                versions.forEach(v -> {
                    if (v.isCurrent()) {
                        v.setCurrent(false);
                        gameVersionRepository.save(v);
                    }
                });

                // Create a new version with incremented version number
                String nextVersionNumber = incrementVersion(currentVer.getVersionNumber());
                GameVersion newVer = new GameVersion();
                newVer.setGame(game);
                newVer.setVersionNumber(nextVersionNumber);
                newVer.setChangelog("Update source code");
                newVer.setFileUrl(fileUrl);
                newVer.setCurrent(true);
                gameVersionRepository.save(newVer);
                log.info("Created new game version {} for game: {}", nextVersionNumber, game.getId());
            } else {
                // Just update the fileUrl of the current pending/draft version
                currentVer.setFileUrl(fileUrl);
                gameVersionRepository.save(currentVer);
                log.info("Updated fileUrl of current game version {} to: {}", currentVer.getVersionNumber(), fileUrl);
            }
        }
    }
}
