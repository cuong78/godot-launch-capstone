package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.ExternalPublishResponse;
import com.godotlaunch.backend.entity.ExternalPublish;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.repository.ExternalPublishRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.service.GooglePlayPublishService;
import com.godotlaunch.backend.service.StorePublishService;
import com.godotlaunch.backend.service.SeaweedFsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StorePublishServiceImpl implements StorePublishService {

    private final GameRepository gameRepository;
    private final GameVersionRepository gameVersionRepository;
    private final ExternalPublishRepository externalPublishRepository;
    private final SeaweedFsService seaweedFsService;
    private final GooglePlayPublishService googlePlayPublishService;

    @Override
    @Transactional
    public ExternalPublishResponse uploadBuildAndPublish(UUID gameId, MultipartFile file, String versionNumber,
                                                          String changelog, UUID adminId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (game.getStatus() != GameStatus.awaiting_store_build) {
            throw new RuntimeException("Game chưa sẵn sàng upload build — hợp đồng chưa được developer ký xong");
        }
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File build (APK/AAB) là bắt buộc");
        }
        if (versionNumber == null || versionNumber.isBlank()) {
            throw new RuntimeException("Version number là bắt buộc");
        }

        String fileUrl = seaweedFsService.uploadFile(file, "games/" + gameId + "/builds");

        gameVersionRepository.findByGame_IdAndIsCurrentTrue(gameId)
                .ifPresent(prev -> {
                    prev.setCurrent(false);
                    gameVersionRepository.save(prev);
                });

        GameVersion version = new GameVersion();
        version.setGame(game);
        version.setVersionNumber(versionNumber);
        version.setChangelog(changelog);
        version.setFileUrl(fileUrl);
        version.setCurrent(true);
        version = gameVersionRepository.save(version);

        ExternalPublish publish = googlePlayPublishService.publishGameToStore(version);

        return toResponse(publish, version);
    }

    @Override
    @Transactional(readOnly = true)
    public ExternalPublishResponse getLatestForGame(UUID gameId) {
        return externalPublishRepository.findFirstByGame_IdOrderByCreatedAtDesc(gameId)
                .map(p -> toResponse(p, p.getGameVersion()))
                .orElse(null);
    }

    private ExternalPublishResponse toResponse(ExternalPublish publish, GameVersion version) {
        return ExternalPublishResponse.builder()
                .id(publish.getId())
                .gameId(publish.getGame().getId())
                .gameVersionId(version != null ? version.getId() : null)
                .versionNumber(version != null ? version.getVersionNumber() : null)
                .status(publish.getStatus().name())
                .externalAppId(publish.getExternalAppId())
                .storeUrl(publish.getStoreUrl())
                .submittedAt(publish.getSubmittedAt())
                .liveAt(publish.getLiveAt())
                .rejectedReason(publish.getRejectedReason())
                .createdAt(publish.getCreatedAt())
                .build();
    }
}
