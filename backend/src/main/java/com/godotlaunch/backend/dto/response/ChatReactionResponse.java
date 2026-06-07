package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.ReactionType;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatReactionResponse {
    private UUID id;
    private UUID chatId;
    private UserSummary user;
    private ReactionType reactionType;
    private Instant createdAt;
    private boolean isNew;
}
