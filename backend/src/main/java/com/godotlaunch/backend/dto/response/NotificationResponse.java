package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.NotificationType;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private UUID id;
    private UserSummary sender;
    private NotificationType type;
    private String message;
    private String targetId;
    private boolean isRead;
    private Instant createdAt;
}
