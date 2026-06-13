package com.godotlaunch.backend.dto.response;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private UUID id;
    private UserSummary sender;
    private UserSummary recipient;
    private String content;
    private boolean isRead;
    private Instant createdAt;
}
