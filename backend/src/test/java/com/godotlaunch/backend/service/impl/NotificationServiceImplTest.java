package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.NotificationResponse;
import com.godotlaunch.backend.entity.Notification;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.repository.NotificationRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SimpMessagingTemplate simpMessagingTemplate;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private User recipient;
    private Notification notification;
    private UUID notificationId;

    @BeforeEach
    void setUp() {
        recipient = new User();
        recipient.setId(UUID.randomUUID());
        recipient.setEmail("user@godotlaunch.dev");

        notificationId = UUID.randomUUID();
        notification = new Notification();
        notification.setId(notificationId);
        notification.setRecipient(recipient);
        notification.setType(NotificationType.GAME_REVIEW_RESULT);
        notification.setMessage("Game approved");
        notification.setRead(false);
    }

    @Test
    @DisplayName("shouldGetMyNotifications_WhenUserExists")
    void shouldGetMyNotifications_WhenUserExists() {
        // Arrange
        when(userRepository.findByEmail(recipient.getEmail())).thenReturn(Optional.of(recipient));
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(recipient.getId())).thenReturn(List.of(notification));

        // Act
        List<NotificationResponse> result = notificationService.getMyNotifications(recipient.getEmail());

        // Assert
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMessage()).isEqualTo("Game approved");
    }

    @Test
    @DisplayName("shouldThrowException_WhenUserNotFound")
    void shouldThrowException_WhenUserNotFound() {
        // Arrange
        when(userRepository.findByEmail("unknown@godotlaunch.dev")).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> notificationService.getMyNotifications("unknown@godotlaunch.dev"))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    @DisplayName("shouldGetUnreadCount_WhenUserExists")
    void shouldGetUnreadCount_WhenUserExists() {
        // Arrange
        when(userRepository.findByEmail(recipient.getEmail())).thenReturn(Optional.of(recipient));
        when(notificationRepository.countByRecipientIdAndIsReadFalse(recipient.getId())).thenReturn(3L);

        // Act
        long count = notificationService.getUnreadCount(recipient.getEmail());

        // Assert
        assertThat(count).isEqualTo(3L);
    }

    @Test
    @DisplayName("shouldMarkAsRead_WhenOwnerMatches")
    void shouldMarkAsRead_WhenOwnerMatches() {
        // Arrange
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        // Act
        notificationService.markAsRead(notificationId, recipient.getEmail());

        // Assert
        assertThat(notification.isRead()).isTrue();
        verify(notificationRepository, times(1)).save(notification);
    }

    @Test
    @DisplayName("shouldThrowException_WhenMarkAsReadUnauthorized")
    void shouldThrowException_WhenMarkAsReadUnauthorized() {
        // Arrange
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        // Act & Assert
        assertThatThrownBy(() -> notificationService.markAsRead(notificationId, "other@godotlaunch.dev"))
                .isInstanceOf(SecurityException.class);

        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("shouldCreateAndSendNotification_PushWebSocketAndEmail")
    void shouldCreateAndSendNotification_PushWebSocketAndEmail() {
        // Arrange
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        notificationService.createAndSendNotification(recipient, null, NotificationType.GAME_REVIEW_RESULT, "Test Msg", "123");

        // Assert
        verify(notificationRepository, times(1)).save(any(Notification.class));
        verify(simpMessagingTemplate, times(1)).convertAndSendToUser(eq(recipient.getEmail()), eq("/queue/notifications"), any(NotificationResponse.class));
        verify(emailService, times(1)).sendNotificationEmail(eq(recipient.getEmail()), anyString(), eq("Test Msg"));
    }
}
