package com.godotlaunch.backend.dto.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSummaryDto {

    private double averageRating;

    private long totalReviews;

    private Map<Integer, Long> ratingBreakdown;

    private boolean userCanReview;

    private ReviewResponse currentUserReview;
}
