package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.ExternalPublish;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.ExtStatus;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.repository.ExternalPublishRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.GooglePlayPublishService;
import com.godotlaunch.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Google Play KHÔNG có webhook cho kết quả review — polling định kỳ để cập nhật
 * ExternalPublish.status (submitted → live/rejected) và game.status khi có kết quả cuối.
 * Xem docs/diagram/2 push-game-sequence.puml (loop polling).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExternalPublishPollingService {

    private final ExternalPublishRepository externalPublishRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final GooglePlayPublishService googlePlayPublishService;
    private final NotificationService notificationService;

    @Scheduled(fixedDelayString = "${app.google-play.poll-interval-ms:1800000}")
    @Transactional
    public void pollPendingReviews() {
        List<ExternalPublish> submitted = externalPublishRepository.findByStatus(ExtStatus.submitted);
        if (submitted.isEmpty()) return;

        log.info("Polling {} bản submit Google Play đang chờ duyệt...", submitted.size());
        for (ExternalPublish publish : submitted) {
            ExtStatus before = publish.getStatus();
            try {
                googlePlayPublishService.checkReviewStatus(publish);
            } catch (Exception e) {
                log.error("Lỗi kiểm tra review status cho ExternalPublish {}: {}", publish.getId(), e.getMessage());
                continue;
            }
            if (publish.getStatus() == before) continue; // chưa có kết quả cuối

            externalPublishRepository.save(publish);
            Game game = publish.getGame();
            User developer = game.getCreator();

            if (publish.getStatus() == ExtStatus.live) {
                game.setStatus(GameStatus.published);
                gameRepository.save(game);
                notificationService.createAndSendNotification(
                        developer, null, NotificationType.STORE_PUBLISH_RESULT,
                        "Chúc mừng! Trò chơi '" + game.getTitle() + "' của bạn đã chính thức phát hành trên Google Play Store: " + publish.getStoreUrl(),
                        game.getId().toString()
                );
            } else if (publish.getStatus() == ExtStatus.rejected) {
                notificationService.createAndSendNotification(
                        developer, null, NotificationType.STORE_PUBLISH_RESULT,
                        "Google Play đã từ chối xuất bản game '" + game.getTitle() + "'. Lý do: " + publish.getRejectedReason(),
                        game.getId().toString()
                );
                for (User adminUser : userRepository.findByRole_NameIgnoreCase("admin")) {
                    notificationService.createAndSendNotification(
                            adminUser, developer, NotificationType.STORE_PUBLISH_RESULT,
                            "Google Play từ chối game '" + game.getTitle() + "': " + publish.getRejectedReason(),
                            game.getId().toString()
                    );
                }
            }
        }
    }
}
