package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.NotificationResponse;
import com.godotlaunch.backend.dto.response.UserSummary;
import com.godotlaunch.backend.entity.Notification;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.repository.NotificationRepository;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.EmailService;
import com.godotlaunch.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Collection;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final EmailService emailService;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        return notificationRepository.countByRecipientIdAndIsReadFalse(user.getId());
    }

    @Override
    @Transactional
    public void markAsRead(UUID notificationId, String email) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        
        if (!notification.getRecipient().getEmail().equalsIgnoreCase(email)) {
            throw new SecurityException("Unauthorized action");
        }
        
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        
        List<Notification> unread = notificationRepository.findAllByRecipientIdAndIsReadFalse(user.getId());
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unread);
    }

    @Override
    @Transactional
    public void createAndSendNotification(User recipient, User sender, NotificationType type, String message, String targetId) {
        if (recipient == null) {
            return;
        }

        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setMessage(message);
        notification.setTargetId(targetId);
        notification.setRead(false);
        notification.setCreatedAt(Instant.now());

        Notification saved = notificationRepository.save(notification);
        NotificationResponse response = mapToResponse(saved);

        Runnable pushTask = () -> {
            try {
                String targetEmail = recipient.getEmail().toLowerCase().trim();
                // Push real-time over user queue
                simpMessagingTemplate.convertAndSendToUser(
                        targetEmail, 
                        "/queue/notifications", 
                        response
                );
                log.info("Successfully pushed notification over WebSocket user queue to {}", targetEmail);
            } catch (Exception e) {
                log.error("Failed to push notification over WebSocket: {}", e.getMessage());
            }
        };

        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        pushTask.run();
                    }
                }
            );
        } else {
            pushTask.run();
        }

        try {
            // Send email notification asynchronously
            String subject = "Godot Launch - New Interaction!";
            emailService.sendNotificationEmail(recipient.getEmail(), subject, message);
            log.info("Successfully triggered async email notification to {}", recipient.getEmail());
        } catch (Exception e) {
            log.error("Failed to trigger email notification: {}", e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void dispatchPersistedNotifications(Collection<String> eventKeys) {
        if (eventKeys == null || eventKeys.isEmpty()) {
            return;
        }
        for (String eventKey : eventKeys) {
            notificationRepository.findByEventKey(eventKey).ifPresent(notification -> {
                NotificationResponse response = mapToResponse(notification);
                String targetEmail = notification.getRecipient().getEmail().toLowerCase().trim();
                try {
                    simpMessagingTemplate.convertAndSendToUser(
                            targetEmail,
                            "/queue/notifications",
                            response
                    );
                } catch (Exception exception) {
                    log.error("Failed to push persisted notification {}: {}", notification.getId(), exception.getMessage());
                }
                try {
                    emailService.sendNotificationEmail(
                            notification.getRecipient().getEmail(),
                            "Godot Launch - Game update available",
                            notification.getMessage()
                    );
                } catch (Exception exception) {
                    log.error("Failed to trigger release email for notification {}: {}",
                            notification.getId(), exception.getMessage());
                }
            });
        }
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .sender(null)
                .type(notification.getType())
                .message(notification.getMessage())
                .targetId(notification.getTargetId())
                .metadata(notification.getMetadata())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public void markChatNotificationsAsRead(UUID recipientId, UUID senderId) {
        // Chat notifications are no longer stored in database
    }
}
