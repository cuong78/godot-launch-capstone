package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.entity.MarketplaceItem;
import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.Payment;
import com.godotlaunch.backend.entity.SourceDownload;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.FileType;
import com.godotlaunch.backend.entity.enums.ItemType;
import com.godotlaunch.backend.entity.enums.OrderStatus;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.repository.SourceDownloadRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.AwsS3Service;
import com.godotlaunch.backend.service.DownloadService;
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
    private static final int DEVICE_INFO_MAX_LENGTH = 200;

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final SourceDownloadRepository sourceDownloadRepository;
    private final StorageRouter storageRouter;
    private final AwsS3Service awsS3Service;

    @Override
    @Transactional
    public DownloadResource downloadPurchase(UUID purchaseId, String requesterEmail, String ipAddress, String userAgent) {
        User buyer = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Order order = orderRepository.findById(purchaseId)
                .orElseThrow(() -> new AppException(ErrorCode.ACCESS_DENIED));

        Payment payment = order.getPayment();
        MarketplaceItem item = order.getMarketplaceItem();

        if (!order.getBuyer().getId().equals(buyer.getId())
                || order.getOrderStatus() != OrderStatus.PAID
                || payment == null
                || payment.getPaymentStatus() != PaymentStatus.PAID
                || item == null
                || item.getItemType() != ItemType.source_code) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        String bundleUrl = sourceSnapshotRepository.findByMarketplaceItemIdOrderByCreatedAtDesc(item.getId()).stream()
                .map(com.godotlaunch.backend.entity.SourceSnapshot::getBundleUrl)
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null);

        String downloadUrl = StringUtils.hasText(bundleUrl) ? bundleUrl : item.getFileUrl();

        String objectKey = extractObjectKey(downloadUrl);
        if (!StringUtils.hasText(objectKey)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        InputStream inputStream = StringUtils.hasText(bundleUrl)
                ? storageRouter.getInputStream(FileType.source_bundle, objectKey)
                : awsS3Service.getObjectStream(objectKey);

        SourceDownload sourceDownload = new SourceDownload();
        sourceDownload.setUser(buyer);
        sourceDownload.setMarketplaceItem(item);
        sourceDownload.setOrder(order);
        sourceDownload.setIpAddress(normalize(ipAddress));
        sourceDownload.setDeviceInfo(truncate(userAgent, DEVICE_INFO_MAX_LENGTH));
        sourceDownload.setDownloadCount(resolveNextDownloadCount(buyer.getId(), item.getId(), order.getId()));
        sourceDownloadRepository.save(sourceDownload);

        return new DownloadResource(inputStream, buildDownloadFileName(item.getTitle()));
    }

    private Integer resolveNextDownloadCount(UUID buyerId, UUID itemId, UUID orderId) {
        long currentCount = sourceDownloadRepository.countByUserIdAndMarketplaceItemIdAndOrderId(buyerId, itemId, orderId);
        return Math.toIntExact(currentCount + 1);
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

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String truncate(String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        String normalized = value.trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }
}
