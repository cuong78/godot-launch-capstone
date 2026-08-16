package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.response.GameEntitlementResponse;
import com.godotlaunch.backend.dto.response.GameVersionSummaryResponse;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.GameVersionRepository;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.GameEntitlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameEntitlementServiceImpl implements GameEntitlementService {

    private final UserRepository userRepository;
    private final GameRepository gameRepository;
    private final OrderRepository orderRepository;
    private final GameVersionRepository gameVersionRepository;

    @Override
    @Transactional(readOnly = true)
    public GameEntitlementResponse getEntitlement(UUID gameId, String requesterEmail) {
        User user = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (!gameRepository.existsById(gameId)) {
            throw new AppException(ErrorCode.GAME_NOT_FOUND);
        }

        Order order = orderRepository.findByBuyerIdAndGameId(user.getId(), gameId).orElse(null);
        GameVersion currentVersion = gameVersionRepository.findByGame_IdAndIsCurrentTrue(gameId).orElse(null);

        if (order == null) {
            return GameEntitlementResponse.builder()
                    .owned(false)
                    .currentVersion(toSummary(currentVersion))
                    .downloadState(GameEntitlementResponse.DownloadState.NOT_OWNED)
                    .build();
        }

        GameVersion lastDownloadedVersion = order.getLastDownloadedGameVersion();
        GameEntitlementResponse.DownloadState state;
        if (currentVersion == null || !StringUtils.hasText(currentVersion.getFileUrl())
                || "pending".equalsIgnoreCase(currentVersion.getFileUrl())) {
            state = GameEntitlementResponse.DownloadState.PACKAGE_UNAVAILABLE;
        } else if (lastDownloadedVersion == null) {
            state = GameEntitlementResponse.DownloadState.FIRST_DOWNLOAD_AVAILABLE;
        } else if (lastDownloadedVersion.getId().equals(currentVersion.getId())) {
            state = GameEntitlementResponse.DownloadState.UP_TO_DATE;
        } else {
            state = GameEntitlementResponse.DownloadState.UPDATE_AVAILABLE;
        }

        return GameEntitlementResponse.builder()
                .owned(true)
                .purchaseId(order.getId())
                .currentVersion(toSummary(currentVersion))
                .lastDownloadedVersion(toSummary(lastDownloadedVersion))
                .downloadState(state)
                .downloadEndpoint(state == GameEntitlementResponse.DownloadState.PACKAGE_UNAVAILABLE
                        ? null
                        : "/api/v1/downloads/" + order.getId())
                .build();
    }

    private GameVersionSummaryResponse toSummary(GameVersion version) {
        if (version == null) {
            return null;
        }
        return GameVersionSummaryResponse.builder()
                .id(version.getId())
                .versionNumber(version.getVersionNumber())
                .changelog(version.getChangelog())
                .releasedAt(version.getReleasedAt())
                .build();
    }
}
