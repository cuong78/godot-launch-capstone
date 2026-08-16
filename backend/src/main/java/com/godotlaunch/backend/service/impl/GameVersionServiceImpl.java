package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.GameVersionReleaseEvent;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.GameVersionReleaseEventRepository;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.service.GameVersionService;
import com.godotlaunch.backend.util.VersionUtils;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class GameVersionServiceImpl implements GameVersionService {

    private final GameRepository gameRepository;
    private final GameVersionRepository gameVersionRepository;
    private final GameVersionReleaseEventRepository releaseEventRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional
    public GameVersion activateApprovedUpdate(
            Game game,
            SourceSnapshot approvedSnapshot,
            String requestedVersionNumber,
            String changelog
    ) {
        Game lockedGame = gameRepository.findByIdForUpdate(game.getId())
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        if (lockedGame.getPendingUpdateSnapshot() == null
                || !lockedGame.getPendingUpdateSnapshot().getId().equals(approvedSnapshot.getId())) {
            throw new AppException(ErrorCode.GAME_VERSION_CONFLICT);
        }
        if (!StringUtils.hasText(approvedSnapshot.getBundleUrl())) {
            throw new AppException(ErrorCode.GAME_PACKAGE_UNAVAILABLE);
        }

        GameVersion currentVersion = gameVersionRepository.findByGame_IdAndIsCurrentTrue(lockedGame.getId())
                .orElseThrow(() -> new AppException(ErrorCode.GAME_VERSION_NOT_FOUND));
        String nextVersionNumber = StringUtils.hasText(requestedVersionNumber)
                ? requestedVersionNumber.trim()
                : VersionUtils.incrementVersion(currentVersion.getVersionNumber());

        if (gameVersionRepository.findByGame_IdAndVersionNumber(lockedGame.getId(), nextVersionNumber).isPresent()) {
            throw new AppException(ErrorCode.GAME_VERSION_CONFLICT);
        }

        gameVersionRepository.deactivateCurrentVersion(lockedGame.getId());

        GameVersion releasedVersion = new GameVersion();
        releasedVersion.setGame(lockedGame);
        releasedVersion.setVersionNumber(nextVersionNumber);
        releasedVersion.setChangelog(StringUtils.hasText(changelog) ? changelog.trim() : "Update source code");
        releasedVersion.setFileUrl(approvedSnapshot.getBundleUrl());
        releasedVersion.setCurrent(true);
        releasedVersion = gameVersionRepository.saveAndFlush(releasedVersion);
        entityManager.refresh(releasedVersion);

        lockedGame.setPendingUpdateSnapshot(null);
        gameRepository.save(lockedGame);

        GameVersionReleaseEvent releaseEvent = new GameVersionReleaseEvent();
        releaseEvent.setGame(lockedGame);
        releaseEvent.setGameVersion(releasedVersion);
        releaseEvent.setStatus("pending");
        releaseEvent.setAttempts(0);
        releaseEvent.setNextAttemptAt(Instant.now());
        releaseEventRepository.save(releaseEvent);

        return releasedVersion;
    }
}
