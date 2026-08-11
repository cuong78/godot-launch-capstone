package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.review.CreateReviewRequest;
import com.godotlaunch.backend.dto.review.ReviewResponse;
import com.godotlaunch.backend.dto.review.ReviewSummaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ReviewService {

    ReviewResponse createOrUpdateReview(String userEmail, CreateReviewRequest request);

    ReviewSummaryDto getGameReviewSummary(UUID gameId, String currentEmail);

    ReviewSummaryDto getAssetReviewSummary(UUID assetId, String currentEmail);

    Page<ReviewResponse> getGameReviews(UUID gameId, Pageable pageable);

    Page<ReviewResponse> getAssetReviews(UUID assetId, Pageable pageable);

    Page<ReviewResponse> getAllReviews(Pageable pageable);

    void deleteReview(UUID reviewId, String userEmail);
}
