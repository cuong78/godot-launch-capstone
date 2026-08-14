package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.review.CreateReviewRequest;
import com.godotlaunch.backend.dto.review.ReviewResponse;
import com.godotlaunch.backend.dto.review.ReviewSummaryDto;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Tag(name = "Review API", description = "Endpoints for game and marketplace asset reviews & ratings")
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Submit or update review", description = "Allows a verified buyer to submit or update a 1-5 star rating and comment for a game or asset.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<ReviewResponse>> createOrUpdateReview(
            @Valid @RequestBody CreateReviewRequest request,
            Principal principal) {
        ReviewResponse response = reviewService.createOrUpdateReview(principal.getName(), request);
        return ResponseEntity.ok(ApiResponse.success(response, "Đánh giá sản phẩm thành công."));
    }

    @GetMapping("/game/{gameId}/summary")
    @Operation(summary = "Get game review summary", description = "Retrieves average rating, total count, rating breakdown, and eligibility for current user.")
    public ResponseEntity<ApiResponse<ReviewSummaryDto>> getGameReviewSummary(
            @PathVariable UUID gameId,
            Principal principal) {
        String userEmail = principal != null ? principal.getName() : null;
        ReviewSummaryDto summary = reviewService.getGameReviewSummary(gameId, userEmail);
        return ResponseEntity.ok(ApiResponse.success(summary, "Lấy thông tin tổng quan đánh giá thành công."));
    }

    @GetMapping("/asset/{assetId}/summary")
    @Operation(summary = "Get asset review summary", description = "Retrieves average rating, total count, rating breakdown, and eligibility for current user.")
    public ResponseEntity<ApiResponse<ReviewSummaryDto>> getAssetReviewSummary(
            @PathVariable UUID assetId,
            Principal principal) {
        String userEmail = principal != null ? principal.getName() : null;
        ReviewSummaryDto summary = reviewService.getAssetReviewSummary(assetId, userEmail);
        return ResponseEntity.ok(ApiResponse.success(summary, "Lấy thông tin tổng quan đánh giá thành công."));
    }

    @GetMapping("/game/{gameId}")
    @Operation(summary = "Get paginated game reviews", description = "Retrieves reviews list for a specific game.")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getGameReviews(
            @PathVariable UUID gameId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ReviewResponse> reviews = reviewService.getGameReviews(gameId, pageable);
        return ResponseEntity.ok(ApiResponse.success(reviews, "Lấy danh sách đánh giá thành công."));
    }

    @GetMapping("/asset/{assetId}")
    @Operation(summary = "Get paginated asset reviews", description = "Retrieves reviews list for a specific asset.")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getAssetReviews(
            @PathVariable UUID assetId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ReviewResponse> reviews = reviewService.getAssetReviews(assetId, pageable);
        return ResponseEntity.ok(ApiResponse.success(reviews, "Lấy danh sách đánh giá thành công."));
    }

    @GetMapping("/all")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all reviews for Admin", description = "Retrieves paginated list of all reviews across games and assets.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getAllReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ReviewResponse> reviews = reviewService.getAllReviews(pageable);
        return ResponseEntity.ok(ApiResponse.success(reviews, "Lấy tất cả đánh giá thành công."));
    }

    @PostMapping("/{id}/reply")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Reply to a review", description = "Allows seller of the game/asset or Admin to reply to a review comment.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<ReviewResponse>> replyToReview(
            @PathVariable UUID id,
            @Valid @RequestBody com.godotlaunch.backend.dto.review.ReplyReviewRequest request,
            Principal principal) {
        ReviewResponse response = reviewService.replyToReview(id, request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Phản hồi đánh giá thành công."));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a review", description = "Deletes a review by ID (Owner or Admin).")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable UUID id,
            Principal principal) {
        reviewService.deleteReview(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa đánh giá thành công."));
    }
}
