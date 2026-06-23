package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.response.NotificationResponse;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.entity.User;

import java.util.List;
import java.util.UUID;

public interface NotificationService {
    List<NotificationResponse> getMyNotifications(String email);
    long getUnreadCount(String email);
    void markAsRead(UUID notificationId, String email);
    void markAllAsRead(String email);
    void createAndSendNotification(User recipient, User sender, NotificationType type, String message, String targetId);
    void markChatNotificationsAsRead(UUID recipientId, UUID senderId);
}
