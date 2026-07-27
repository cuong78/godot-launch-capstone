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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExternalPublishPollingServiceTest {

    @Mock
    private ExternalPublishRepository externalPublishRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private GooglePlayPublishService googlePlayPublishService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ExternalPublishPollingService service;

    private ExternalPublish publish;
    private Game game;
    private User developer;
    private User admin;

    @BeforeEach
    void setUp() {
        developer = new User();
        developer.setId(UUID.randomUUID());
        developer.setEmail("dev@example.com");

        admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setEmail("admin@example.com");

        game = new Game();
        game.setId(UUID.randomUUID());
        game.setTitle("Polled Game");
        game.setStatus(GameStatus.awaiting_store_build);
        game.setCreator(developer);

        publish = new ExternalPublish();
        publish.setId(UUID.randomUUID());
        publish.setGame(game);
        publish.setStatus(ExtStatus.submitted);
        publish.setStoreUrl("http://playstore/app");
        publish.setRejectedReason("Violated policies");
    }

    @Test
    void pollPendingReviews_ShouldReturnImmediately_WhenNoSubmitted() {
        when(externalPublishRepository.findByStatus(ExtStatus.submitted)).thenReturn(Collections.emptyList());

        service.pollPendingReviews();

        verifyNoInteractions(googlePlayPublishService, gameRepository, userRepository, notificationService);
    }

    @Test
    void pollPendingReviews_ShouldDoNothing_WhenStatusRemainsSubmitted() {
        when(externalPublishRepository.findByStatus(ExtStatus.submitted)).thenReturn(List.of(publish));
        doNothing().when(googlePlayPublishService).checkReviewStatus(publish);

        service.pollPendingReviews();

        verify(externalPublishRepository, never()).save(any());
        verifyNoInteractions(gameRepository, userRepository, notificationService);
    }

    @Test
    void pollPendingReviews_ShouldLogExceptionAndContinue_WhenServiceThrowsException() {
        when(externalPublishRepository.findByStatus(ExtStatus.submitted)).thenReturn(List.of(publish));
        doThrow(new RuntimeException("Network timeout")).when(googlePlayPublishService).checkReviewStatus(publish);

        service.pollPendingReviews();

        verify(externalPublishRepository, never()).save(any());
        verifyNoInteractions(gameRepository, userRepository, notificationService);
    }

    @Test
    void pollPendingReviews_ShouldUpdateToLive_WhenStatusChangesToLive() {
        when(externalPublishRepository.findByStatus(ExtStatus.submitted)).thenReturn(List.of(publish));
        doAnswer(inv -> {
            ExternalPublish ep = inv.getArgument(0);
            ep.setStatus(ExtStatus.live);
            return null;
        }).when(googlePlayPublishService).checkReviewStatus(publish);

        service.pollPendingReviews();

        assertThat(game.getStatus()).isEqualTo(GameStatus.published);
        verify(externalPublishRepository, times(1)).save(publish);
        verify(gameRepository, times(1)).save(game);
        verify(notificationService, times(1)).createAndSendNotification(
                eq(developer), eq(developer), eq(NotificationType.SELLER_RESPONSE),
                contains("Polled Game"), eq(game.getId().toString())
        );
    }

    @Test
    void pollPendingReviews_ShouldUpdateToRejected_WhenStatusChangesToRejected() {
        when(externalPublishRepository.findByStatus(ExtStatus.submitted)).thenReturn(List.of(publish));
        doAnswer(inv -> {
            ExternalPublish ep = inv.getArgument(0);
            ep.setStatus(ExtStatus.rejected);
            return null;
        }).when(googlePlayPublishService).checkReviewStatus(publish);
        when(userRepository.findByRole_NameIgnoreCase("admin")).thenReturn(List.of(admin));

        service.pollPendingReviews();

        verify(externalPublishRepository, times(1)).save(publish);
        verify(notificationService, times(1)).createAndSendNotification(
                eq(admin), eq(developer), eq(NotificationType.SELLER_RESPONSE),
                contains("Google Play từ chối game"), eq(game.getId().toString())
        );
        // Game status remains awaiting_store_build
        assertThat(game.getStatus()).isEqualTo(GameStatus.awaiting_store_build);
    }
}
