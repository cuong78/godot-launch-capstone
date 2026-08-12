package com.godotlaunch.backend.dto.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateReviewRequest {

    private UUID gameId;

    private UUID assetId;

    @NotNull(message = "RATING_REQUIRED")
    @Min(value = 1, message = "RATING_MIN_1")
    @Max(value = 5, message = "RATING_MAX_5")
    private Integer rating;

    @Size(max = 1000, message = "COMMENT_TOO_LONG")
    private String comment;
}
