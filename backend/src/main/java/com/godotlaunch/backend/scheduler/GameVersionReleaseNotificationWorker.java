package com.godotlaunch.backend.scheduler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.entity.GameVersionReleaseEvent;
import com.godotlaunch.backend.repository.GameVersionReleaseEventRepository;
import com.godotlaunch.backend.repository.NotificationRepository;
import com.godotlaunch.backend.repository.OrderRepository;
import com.godotlaunch.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class GameVersionReleaseNotificationWorker {

    private static final int PAGE_SIZE = 500;
    private static final int MAX_ATTEMPTS = 8;
    private static final List<Duration> RETRY_DELAYS = List.of(
            Duration.ofMinutes(1),
            Duration.ofMinutes(5),
            Duration.ofMinutes(30),
            Duration.ofHours(2)
    );

    private final GameVersionReleaseEventRepository releaseEventRepository;
    private final OrderRepository orderRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;
    private final MeterRegistry meterRegistry;

    @PostConstruct
    void registerMetrics() {
        Gauge.builder(
                        "game_version_release_events_pending",
                        releaseEventRepository,
                        repository -> repository.countByStatus("pending")
                )
                .description("Number of game-version release events waiting for fan-out")
                .register(meterRegistry);
    }

    @Scheduled(fixedDelayString = "${app.game-version-notifications.fixed-delay-ms:5000}")
    public void processNextEvent() {
        UUID eventId = claimNextEvent();
        if (eventId == null) {
            return;
        }

        long startedAt = System.nanoTime();
        try {
            processPages(eventId);
            markCompleted(eventId);
        } catch (Exception exception) {
            log.error("Game version notification fan-out failed: eventId={}", eventId, exception);
            markForRetry(eventId, exception);
        } finally {
            meterRegistry.timer("game_version_notification_fanout_duration_seconds")
                    .record(System.nanoTime() - startedAt, TimeUnit.NANOSECONDS);
        }
    }

    private UUID claimNextEvent() {
        return transactionTemplate.execute(status -> releaseEventRepository.lockNextProcessableEvent()
                .map(event -> {
                    event.setStatus("processing");
                    event.setAttempts(event.getAttempts() + 1);
                    event.setLockedAt(Instant.now());
                    event.setLastError(null);
                    releaseEventRepository.save(event);
                    return event.getId();
                })
                .orElse(null));
    }

    private void processPages(UUID eventId) {
        int pageNumber = 0;
        boolean hasNext;
        do {
            int currentPage = pageNumber;
            PageResult pageResult = transactionTemplate.execute(status -> processPage(eventId, currentPage));
            if (pageResult == null) {
                throw new IllegalStateException("Release event disappeared while processing: " + eventId);
            }

            // The page transaction has committed before realtime/email dispatch starts.
            notificationService.dispatchPersistedNotifications(pageResult.insertedEventKeys());
            meterRegistry.counter("game_version_notifications_created_total")
                    .increment(pageResult.insertedEventKeys().size());
            hasNext = pageResult.hasNext();
            log.info("Game version notification page completed: eventId={}, gameId={}, gameVersionId={}, page={}, inserted={}",
                    eventId, pageResult.gameId(), pageResult.gameVersionId(), currentPage,
                    pageResult.insertedEventKeys().size());
            pageNumber++;
        } while (hasNext);
    }

    private PageResult processPage(UUID eventId, int pageNumber) {
        GameVersionReleaseEvent event = releaseEventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalStateException("Release event not found: " + eventId));

        if (!"processing".equals(event.getStatus())) {
            throw new IllegalStateException("Release event is not processing: " + eventId);
        }
        if (event.getGameVersion().getReleasedAt() == null) {
            throw new IllegalStateException("Released version has no releasedAt: " + event.getGameVersion().getId());
        }

        Page<OrderRepository.BuyerNotificationTarget> recipients = orderRepository.findReleaseRecipients(
                event.getGame().getId(),
                event.getGameVersion().getReleasedAt(),
                event.getGame().getCreator().getId(),
                PageRequest.of(pageNumber, PAGE_SIZE)
        );

        List<String> insertedEventKeys = new ArrayList<>();
        for (OrderRepository.BuyerNotificationTarget recipient : recipients.getContent()) {
            String eventKey = "game-version-released:" + event.getGameVersion().getId() + ":" + recipient.getUserId();
            String metadata = buildMetadata(event);
            int inserted = notificationRepository.insertGameVersionReleasedNotification(
                    recipient.getUserId(),
                    buildMessage(recipient.getPreferredLanguage(), event.getGame().getTitle(), event.getGameVersion().getVersionNumber()),
                    event.getGame().getId().toString(),
                    metadata,
                    eventKey
            );
            if (inserted == 1) {
                insertedEventKeys.add(eventKey);
            }
        }
        return new PageResult(
                recipients.hasNext(),
                insertedEventKeys,
                event.getGame().getId(),
                event.getGameVersion().getId()
        );
    }

    private String buildMetadata(GameVersionReleaseEvent event) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "gameVersionId", event.getGameVersion().getId().toString(),
                    "versionNumber", event.getGameVersion().getVersionNumber(),
                    "actionUrl", "/games/" + event.getGame().getId() + "?update=" + event.getGameVersion().getId()
            ));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Cannot serialize game release notification metadata", exception);
        }
    }

    private String buildMessage(String language, String gameTitle, String versionNumber) {
        String normalizedLanguage = language == null ? "vi" : language.toLowerCase();
        if (normalizedLanguage.startsWith("en")) {
            return gameTitle + " has been updated to version " + versionNumber
                    + ". View the changes and download the latest version.";
        }
        if (normalizedLanguage.startsWith("ja")) {
            return gameTitle + " のバージョン " + versionNumber
                    + " が公開されました。変更内容を確認して最新版をダウンロードできます。";
        }
        return gameTitle + " đã có phiên bản " + versionNumber
                + ". Game bạn đã mua vừa được cập nhật. Xem thay đổi và tải phiên bản mới.";
    }

    private void markCompleted(UUID eventId) {
        transactionTemplate.executeWithoutResult(status -> {
            GameVersionReleaseEvent event = releaseEventRepository.findById(eventId)
                    .orElseThrow(() -> new IllegalStateException("Release event not found: " + eventId));
            event.setStatus("completed");
            event.setCompletedAt(Instant.now());
            event.setLockedAt(null);
            event.setLastError(null);
            releaseEventRepository.save(event);
        });
    }

    private void markForRetry(UUID eventId, Exception exception) {
        transactionTemplate.executeWithoutResult(status -> releaseEventRepository.findById(eventId).ifPresent(event -> {
            String errorMessage = exception.getMessage() == null
                    ? exception.getClass().getSimpleName()
                    : exception.getMessage();
            event.setLastError(errorMessage.substring(0, Math.min(errorMessage.length(), 4000)));
            event.setLockedAt(null);
            if (event.getAttempts() >= MAX_ATTEMPTS) {
                event.setStatus("failed");
                meterRegistry.counter("game_version_release_events_failed_total").increment();
            } else {
                int delayIndex = Math.min(Math.max(event.getAttempts() - 1, 0), RETRY_DELAYS.size() - 1);
                event.setStatus("pending");
                event.setNextAttemptAt(Instant.now().plus(RETRY_DELAYS.get(delayIndex)));
            }
            releaseEventRepository.save(event);
        }));
    }

    private record PageResult(
            boolean hasNext,
            List<String> insertedEventKeys,
            UUID gameId,
            UUID gameVersionId
    ) {
    }
}
