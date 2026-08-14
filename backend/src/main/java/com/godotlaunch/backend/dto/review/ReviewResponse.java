package com.godotlaunch.backend.dto.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {

    private UUID id;

    private UUID userId;

    private String userName;

    private String userAvatarUrl;

    private UUID gameId;

    private UUID assetId;

    private Integer rating;

    private String comment;

    private String sellerReply;

    private Instant sellerRepliedAt;

    private String adminReply;

    private Instant adminRepliedAt;

    private UUID adminRepliedByUserId;

    private String adminRepliedUserName;

    private Instant createdAt;

    private Instant updatedAt;
}
