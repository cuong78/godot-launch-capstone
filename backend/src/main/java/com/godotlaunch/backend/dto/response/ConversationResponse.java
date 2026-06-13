package com.godotlaunch.backend.dto.response;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationResponse {
    private UserSummary recipient;
    private String lastMessage;
    private long unreadCount;
    private Instant lastActiveAt;
}
