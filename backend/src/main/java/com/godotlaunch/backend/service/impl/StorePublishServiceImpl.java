package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.ExternalPublishResponse;
import com.godotlaunch.backend.entity.ExternalPublish;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.enums.ExtStatus;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.repository.ExternalPublishRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.service.GooglePlayPublishService;
import com.godotlaunch.backend.service.StorePublishService;
import com.godotlaunch.backend.service.SeaweedFsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StorePublishServiceImpl implements StorePublishService {

    private static final int SHORT_DESCRIPTION_MAX_LEN = 80;
    private static final int MIN_SCREENSHOTS = 2;

    private final GameRepository gameRepository;
    private final GameVersionRepository gameVersionRepository;
    private final ExternalPublishRepository externalPublishRepository;
    private final MediaRepository mediaRepository;
    private final SeaweedFsService seaweedFsService;
    private final GooglePlayPublishService googlePlayPublishService;

    @Override
    @Transactional
    public ExternalPublishResponse uploadBuildAndPublish(UUID gameId, MultipartFile file, String versionNumber,
                                                          String changelog, String shortDescription,
                                                          MultipartFile featureGraphic, UUID adminId) {
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
        // Version number trùng chỉ chặn nếu lần nộp gần nhất của NÓ đã submit thành công hoặc đã live —
        // còn nếu lần trước bị Google Play từ chối (hoặc chưa từng nộp xong) thì cho phép sửa & nộp lại
        // với đúng version đó (đa số trường hợp là lần đầu push game lên store, không phải version mới).
        Optional<GameVersion> existingVersion = gameVersionRepository.findByGame_IdAndVersionNumber(gameId, versionNumber);
        if (existingVersion.isPresent()) {
            Optional<ExternalPublish> latestAttempt = externalPublishRepository
                    .findFirstByGameVersion_IdOrderByCreatedAtDesc(existingVersion.get().getId());
            if (latestAttempt.isPresent()
                    && (latestAttempt.get().getStatus() == ExtStatus.submitted || latestAttempt.get().getStatus() == ExtStatus.live)) {
                throw new RuntimeException("Version number '" + versionNumber + "' đang chờ Google Play duyệt hoặc đã live — " +
                        "không thể ghi đè, vui lòng dùng version number mới cho bản cập nhật tiếp theo");
            }
        }
        if (shortDescription == null || shortDescription.isBlank()) {
            throw new RuntimeException("Short description là bắt buộc (Google Play yêu cầu)");
        }
        if (shortDescription.length() > SHORT_DESCRIPTION_MAX_LEN) {
            throw new RuntimeException("Short description tối đa " + SHORT_DESCRIPTION_MAX_LEN + " ký tự");
        }
        if (featureGraphic == null || featureGraphic.isEmpty()) {
            throw new RuntimeException("Feature graphic (1024x500) là bắt buộc cho Google Play store listing");
        }
        if (game.getThumbnailUrl() == null || game.getThumbnailUrl().isBlank()) {
            throw new RuntimeException("Game chưa có thumbnail — không thể dùng làm icon cho Google Play");
        }
        List<String> screenshotUrls = mediaRepository.findByGame_IdAndMediaType(gameId, "image").stream()
                .map(media -> media.getMediaUrl())
                .toList();
        if (screenshotUrls.size() < MIN_SCREENSHOTS) {
            throw new RuntimeException("Game cần tối thiểu " + MIN_SCREENSHOTS +
                    " screenshot để submit lên Google Play (hiện có " + screenshotUrls.size() + ")");
        }

        String featureGraphicUrl = seaweedFsService.uploadFile(featureGraphic, "games/" + gameId + "/store");

        String fileUrl = seaweedFsService.uploadFile(file, "games/" + gameId + "/builds");

        if (existingVersion.isPresent()) {
            gameVersionRepository.deactivateOtherCurrentVersions(gameId, existingVersion.get().getId());
        } else {
            gameVersionRepository.deactivateCurrentVersion(gameId);
        }

        // Nếu version này đã tồn tại nhưng lần nộp trước bị từ chối/chưa xong -> cập nhật lại đúng row đó
        // (không insert row mới, tránh vi phạm UNIQUE(game_id, version_number)).
        GameVersion version = existingVersion.orElseGet(GameVersion::new);
        version.setGame(game);
        version.setVersionNumber(versionNumber);
        version.setChangelog(changelog);
        version.setFileUrl(fileUrl);
        version.setCurrent(true);
        version = gameVersionRepository.save(version);

        ExternalPublish publish = googlePlayPublishService.publishGameToStore(
                version, shortDescription, featureGraphicUrl, screenshotUrls);

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
