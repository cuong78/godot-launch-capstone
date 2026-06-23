package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.ReactionType;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunityChatResponse {
    private UUID id;
    private UserSummary sender;
    private UUID gameId;
    private String message;
    private Integer reactionCount;
    private Integer commentCount;
    private Integer shareCount;
    private boolean isEdited;
    private boolean isDeleted;
    private List<ChatMediaResponse> mediaFiles;
    private Instant createdAt;
    private Instant updatedAt;
    private CommunityChatResponse originalChat;
    private ReactionType currentUserReaction;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMediaResponse {
        private String url;
        private String mediaType;
    }
}
