package com.godotlaunch.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameResponse {
    private UUID id;
    private String title;
    private String description;
    private String thumbnailUrl;
    private BigDecimal downloadPrice;
    private boolean communityAvailable;
    private String status;
    private String creatorName;
    private String categoryName;
}
