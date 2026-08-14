package com.godotlaunch.backend.dto.chat;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageResponse {
    private String id;
    private String sessionId;
    private String senderType;
    private String content;
    private Integer tokensCount;
    private String citationsJson;
    private Instant createdAt;
}
