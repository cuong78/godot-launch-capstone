package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.DownloadService;
import com.godotlaunch.backend.service.SeaweedFsService;
import lombok.RequiredArgsConstructor;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class DownloadServiceImpl implements DownloadService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final GameVersionRepository gameVersionRepository;
    private final SeaweedFsService seaweedFsService;
    private final MeterRegistry meterRegistry;

    @Override
    @Transactional
    public DownloadResource downloadPurchase(UUID purchaseId, String requesterEmail, String ipAddress, String userAgent) {
        User buyer = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Order order = orderRepository.findById(purchaseId)
                .orElseThrow(() -> new AppException(ErrorCode.ACCESS_DENIED));

        if (!order.getBuyer().getId().equals(buyer.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String downloadUrl = null;
        String title = null;
        GameVersion servedGameVersion = null;

        if (order.getAsset() != null) {
            Asset item = order.getAsset();
            downloadUrl = item.getFileUrl();
            title = item.getTitle();
        } else if (order.getGame() != null) {
            Game game = order.getGame();
            servedGameVersion = gameVersionRepository.findByGame_IdAndIsCurrentTrue(game.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.GAME_VERSION_NOT_FOUND));
            downloadUrl = servedGameVersion.getFileUrl();
            title = game.getTitle();
        } else {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (!StringUtils.hasText(downloadUrl) || "pending".equalsIgnoreCase(downloadUrl)) {
            throw new AppException(servedGameVersion != null
                    ? ErrorCode.GAME_PACKAGE_UNAVAILABLE
                    : ErrorCode.FILE_NOT_FOUND);
        }

        String objectKey = seaweedFsService.extractObjectKey(downloadUrl);
        if (!StringUtils.hasText(objectKey)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        InputStream inputStream;
        try {
            inputStream = seaweedFsService.getObjectStream(objectKey);
        } catch (RuntimeException exception) {
            if (servedGameVersion != null) {
                meterRegistry.counter(
                        "game_update_download_failures_total",
                        "reason", "storage_open_failed"
                ).increment();
            }
            throw exception;
        }

        if (servedGameVersion != null) {
            order.setLastDownloadedGameVersion(servedGameVersion);
            order.setLastDownloadedAt(Instant.now());
            orderRepository.save(order);
            meterRegistry.counter(
                    "game_update_downloads_total",
                    "gameId", order.getGame().getId().toString(),
                    "version", servedGameVersion.getVersionNumber()
            ).increment();
        }

        return new DownloadResource(
                inputStream,
                buildDownloadFileName(title, servedGameVersion != null ? servedGameVersion.getVersionNumber() : null),
                servedGameVersion != null ? servedGameVersion.getId() : null,
                servedGameVersion != null ? servedGameVersion.getVersionNumber() : null
        );
    }

    private String buildDownloadFileName(String title, String versionNumber) {
        String normalizedTitle = StringUtils.hasText(title) ? title.trim() : "source-code";
        String asciiTitle = Normalizer.normalize(normalizedTitle, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("[^a-zA-Z0-9]+", "-")
                .replaceAll("(^-|-$)", "")
                .toLowerCase(Locale.ROOT);

        if (!StringUtils.hasText(asciiTitle)) {
            asciiTitle = "source-code";
        }

        String versionSuffix = StringUtils.hasText(versionNumber)
                ? "-v" + versionNumber.replaceAll("[^a-zA-Z0-9._-]", "-")
                : "";
        return asciiTitle + versionSuffix + ".zip";
    }
}
