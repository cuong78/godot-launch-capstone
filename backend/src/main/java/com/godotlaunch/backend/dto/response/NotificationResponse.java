package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.NotificationType;
import lombok.*;

import java.time.Instant;
import java.util.UUID;
import java.util.Map;

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
    private Map<String, Object> metadata;
    private boolean isRead;
    private Instant createdAt;
}
