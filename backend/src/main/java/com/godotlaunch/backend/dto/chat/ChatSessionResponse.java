package com.godotlaunch.backend.dto.chat;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatSessionResponse {
    private String id;
    private String userId;
    private String title;
    private Instant createdAt;
    private Instant updatedAt;
}
