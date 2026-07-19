package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.NotificationResponse;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    @Mock
    private NotificationService notificationService;

    @Mock
    private Principal principal;

    @InjectMocks
    private NotificationController notificationController;

    private String userEmail;

    @BeforeEach
    void setUp() {
        userEmail = "user@godotlaunch.dev";
    }

    @Test
    @DisplayName("shouldGetMyNotifications_WhenAuthenticated")
    void shouldGetMyNotifications_WhenAuthenticated() {
        // Arrange
        NotificationResponse notification = NotificationResponse.builder()
                .id(UUID.randomUUID())
                .type(NotificationType.GAME_REVIEW_RESULT)
                .message("Game approved!")
                .build();

        when(principal.getName()).thenReturn(userEmail);
        when(notificationService.getMyNotifications(userEmail)).thenReturn(List.of(notification));

        // Act
        ResponseEntity<ApiResponse<List<NotificationResponse>>> response = notificationController.getMyNotifications(principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).hasSize(1);
        verify(notificationService, times(1)).getMyNotifications(userEmail);
    }

    @Test
    @DisplayName("shouldGetUnreadCount_WhenAuthenticated")
    void shouldGetUnreadCount_WhenAuthenticated() {
        // Arrange
        when(principal.getName()).thenReturn(userEmail);
        when(notificationService.getUnreadCount(userEmail)).thenReturn(5L);

        // Act
        ResponseEntity<ApiResponse<Long>> response = notificationController.getUnreadCount(principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData()).isEqualTo(5L);
        verify(notificationService, times(1)).getUnreadCount(userEmail);
    }

    @Test
    @DisplayName("shouldMarkAsRead_WhenValidNotificationId")
    void shouldMarkAsRead_WhenValidNotificationId() {
        // Arrange
        UUID notificationId = UUID.randomUUID();
        when(principal.getName()).thenReturn(userEmail);
        doNothing().when(notificationService).markAsRead(notificationId, userEmail);

        // Act
        ResponseEntity<ApiResponse<Void>> response = notificationController.markAsRead(principal, notificationId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(notificationService, times(1)).markAsRead(notificationId, userEmail);
    }

    @Test
    @DisplayName("shouldMarkAllAsRead_WhenCalled")
    void shouldMarkAllAsRead_WhenCalled() {
        // Arrange
        when(principal.getName()).thenReturn(userEmail);
        doNothing().when(notificationService).markAllAsRead(userEmail);

        // Act
        ResponseEntity<ApiResponse<Void>> response = notificationController.markAllAsRead(principal);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(notificationService, times(1)).markAllAsRead(userEmail);
    }
}
