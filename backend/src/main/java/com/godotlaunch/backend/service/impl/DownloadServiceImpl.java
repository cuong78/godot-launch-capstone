package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.FileType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AwsS3Service;
import com.godotlaunch.backend.service.DownloadService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.net.URI;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DownloadServiceImpl implements DownloadService {

    private static final String SOURCE_BUNDLE_MARKER = "marketplace/items/";

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final StorageRouter storageRouter;
    private final AwsS3Service awsS3Service;

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

        if (order.getAsset() != null) {
            Asset item = order.getAsset();
            downloadUrl = item.getFileUrl();
            title = item.getTitle();
        } else if (order.getGame() != null) {
            Game game = order.getGame();
            List<SourceSnapshot> snaps = sourceSnapshotRepository.findByGameIdOrderByCreatedAtDesc(game.getId());
            if (snaps == null || snaps.isEmpty()) {
                throw new AppException(ErrorCode.FILE_NOT_FOUND);
            }
            downloadUrl = snaps.get(0).getBundleUrl();
            title = game.getTitle();
        } else {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String objectKey = extractObjectKey(downloadUrl);
        if (!StringUtils.hasText(objectKey)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        InputStream inputStream = storageRouter.getInputStream(FileType.source_bundle, objectKey);

        return new DownloadResource(inputStream, buildDownloadFileName(title));
    }

    private String extractObjectKey(String rawUrl) {
        if (!StringUtils.hasText(rawUrl) || "pending".equalsIgnoreCase(rawUrl)) {
            return null;
        }

        String awsMarker = ".amazonaws.com/";
        int awsIndex = rawUrl.indexOf(awsMarker);
        if (awsIndex >= 0) {
            return rawUrl.substring(awsIndex + awsMarker.length());
        }

        if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
            try {
                String path = URI.create(rawUrl).getPath();
                if (!StringUtils.hasText(path)) {
                    return null;
                }

                String normalizedPath = path.startsWith("/") ? path.substring(1) : path;
                int markerIndex = normalizedPath.indexOf(SOURCE_BUNDLE_MARKER);
                return markerIndex >= 0 ? normalizedPath.substring(markerIndex) : normalizedPath;
            } catch (Exception ignored) {
                return null;
            }
        }

        return rawUrl;
    }

    private String buildDownloadFileName(String title) {
        String normalizedTitle = StringUtils.hasText(title) ? title.trim() : "source-code";
        String asciiTitle = Normalizer.normalize(normalizedTitle, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("[^a-zA-Z0-9]+", "-")
                .replaceAll("(^-|-$)", "")
                .toLowerCase(Locale.ROOT);

        if (!StringUtils.hasText(asciiTitle)) {
            asciiTitle = "source-code";
        }

        return asciiTitle + ".zip";
    }
}
