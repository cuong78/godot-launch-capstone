package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.ExternalPublish;
import com.godotlaunch.backend.entity.GameVersion;
import com.godotlaunch.backend.entity.enums.ExtStatus;
import com.godotlaunch.backend.repository.ExternalPublishRepository;
import com.godotlaunch.backend.service.GooglePlayPublishService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Giả lập Google Play Developer API — dùng khi chưa có service account thật (dev/test).
 * Submit xong đánh dấu ngay "submitted"; ExternalPublishPollingService sẽ tự chuyển
 * sang "live" sau một khoảng thời gian giả lập (xem application.yaml app.google-play.*).
 */
@Service
@ConditionalOnProperty(name = "app.google-play.mock", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class MockGooglePlayPublishServiceImpl implements GooglePlayPublishService {

    private final ExternalPublishRepository externalPublishRepository;

    @Value("${app.google-play.mock-review-delay-seconds:30}")
    private long mockReviewDelaySeconds;

    @Override
    @Transactional
    public ExternalPublish publishGameToStore(GameVersion version, String shortDescription,
                                               String featureGraphicUrl, List<String> screenshotUrls) {
        ExternalPublish publish = new ExternalPublish();
        publish.setGame(version.getGame());
        publish.setGameVersion(version);
        publish.setStatus(ExtStatus.submitted);
        publish.setExternalAppId("mock.godotlaunch." + version.getGame().getId().toString().replace("-", ""));
        publish.setSubmittedAt(Instant.now());
        externalPublishRepository.save(publish);

        log.info("[MOCK] Submitted game {} version {} to Google Play (giả lập, không gọi API thật) — " +
                        "shortDescription='{}', featureGraphic={}, {} screenshots",
                version.getGame().getId(), version.getVersionNumber(), shortDescription,
                featureGraphicUrl, screenshotUrls.size());
        return publish;
    }

    @Override
    @Transactional
    public void checkReviewStatus(ExternalPublish publish) {
        if (publish.getSubmittedAt() == null) return;
        Duration elapsed = Duration.between(publish.getSubmittedAt(), Instant.now());
        if (elapsed.getSeconds() < mockReviewDelaySeconds) {
            return; // vẫn đang "review" giả lập
        }
        publish.setStatus(ExtStatus.live);
        publish.setLiveAt(Instant.now());
        publish.setStoreUrl("https://play.google.com/store/apps/details?id=" + publish.getExternalAppId());
        log.info("[MOCK] Game {} version {} đã 'live' trên Google Play (giả lập)",
                publish.getGame().getId(), publish.getGameVersion().getVersionNumber());
    }
}
