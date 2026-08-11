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

    private Instant createdAt;

    private Instant updatedAt;
}
