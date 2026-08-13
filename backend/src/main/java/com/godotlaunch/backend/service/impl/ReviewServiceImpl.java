package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.constant.ErrorCode;
import com.godotlaunch.backend.dto.review.CreateReviewRequest;
import com.godotlaunch.backend.dto.review.ReviewResponse;
import com.godotlaunch.backend.dto.review.ReviewSummaryDto;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Review;
import com.godotlaunch.backend.entity.User;
import com.godotlaunch.backend.entity.enums.GameStatus;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import com.godotlaunch.backend.entity.enums.NotificationType;
import com.godotlaunch.backend.exception.AppException;
import com.godotlaunch.backend.repository.*;
import com.godotlaunch.backend.service.NotificationService;
import com.godotlaunch.backend.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final GameRepository gameRepository;
    private final AssetRepository assetRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public ReviewResponse createOrUpdateReview(String userEmail, CreateReviewRequest request) {
        if ((request.getGameId() == null && request.getAssetId() == null) ||
            (request.getGameId() != null && request.getAssetId() != null)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Must specify either gameId or assetId, but not both.");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!"active".equalsIgnoreCase(user.getStatus())) {
            throw new AppException(ErrorCode.USER_BANNED);
        }

        UUID userId = user.getId();

        // Sanitize comment to prevent basic XSS
        String cleanComment = request.getComment();
        if (cleanComment != null) {
            cleanComment = cleanComment.replaceAll("<[^>]*>", "").trim();
        }

        Review review;

        if (request.getGameId() != null) {
            Game game = gameRepository.findById(request.getGameId())
                    .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

            if (game.getStatus() != GameStatus.published) {
                throw new AppException(ErrorCode.REVIEW_TARGET_INVALID);
            }

            if (game.getCreator().getId().equals(userId)) {
                throw new AppException(ErrorCode.REVIEW_SELF_NOT_ALLOWED);
            }

            boolean purchased = orderRepository.existsByBuyerIdAndGameId(userId, game.getId());
            if (!purchased) {
                throw new AppException(ErrorCode.REVIEW_NOT_PURCHASED);
            }

            review = reviewRepository.findByUserIdAndGameId(userId, game.getId())
                    .orElseGet(Review::new);

            review.setUser(user);
            review.setGame(game);
            review.setAsset(null);
            review.setRating(request.getRating());
            review.setComment(cleanComment);

            review = reviewRepository.save(review);
            recalculateGameRating(game);

        } else {
            Asset asset = assetRepository.findById(request.getAssetId())
                    .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

            if (asset.getStatus() != ItemStatus.active) {
                throw new AppException(ErrorCode.REVIEW_TARGET_INVALID);
            }

            if (asset.getSeller().getId().equals(userId)) {
                throw new AppException(ErrorCode.REVIEW_SELF_NOT_ALLOWED);
            }

            boolean purchased = orderRepository.existsByBuyerIdAndAssetId(userId, asset.getId());
            if (!purchased) {
                throw new AppException(ErrorCode.REVIEW_NOT_PURCHASED);
            }

            review = reviewRepository.findByUserIdAndAssetId(userId, asset.getId())
                    .orElseGet(Review::new);

            review.setUser(user);
            review.setGame(null);
            review.setAsset(asset);
            review.setRating(request.getRating());
            review.setComment(cleanComment);

            review = reviewRepository.save(review);
            recalculateAssetRating(asset);
        }

        return mapToResponse(review);
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewSummaryDto getGameReviewSummary(UUID gameId, String currentEmail) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));

        Double avg = reviewRepository.getAverageRatingByGameId(gameId);
        Long total = reviewRepository.countByGameId(gameId);
        List<Object[]> breakdownList = reviewRepository.getRatingBreakdownByGameId(gameId);

        Map<Integer, Long> breakdown = buildBreakdownMap(breakdownList);

        boolean userCanReview = false;
        ReviewResponse currentUserReview = null;

        if (currentEmail != null) {
            Optional<User> userOpt = userRepository.findByEmail(currentEmail);
            if (userOpt.isPresent()) {
                UUID currentUserId = userOpt.get().getId();
                boolean isCreator = game.getCreator().getId().equals(currentUserId);
                boolean purchased = orderRepository.existsByBuyerIdAndGameId(currentUserId, gameId);
                userCanReview = !isCreator && purchased;

                Optional<Review> existing = reviewRepository.findByUserIdAndGameId(currentUserId, gameId);
                if (existing.isPresent()) {
                    currentUserReview = mapToResponse(existing.get());
                }
            }
        }

        return ReviewSummaryDto.builder()
                .averageRating(avg != null ? Math.round(avg * 100.0) / 100.0 : 0.0)
                .totalReviews(total != null ? total : 0)
                .ratingBreakdown(breakdown)
                .userCanReview(userCanReview)
                .currentUserReview(currentUserReview)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewSummaryDto getAssetReviewSummary(UUID assetId, String currentEmail) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new AppException(ErrorCode.MARKETPLACE_ITEM_NOT_FOUND));

        Double avg = reviewRepository.getAverageRatingByAssetId(assetId);
        Long total = reviewRepository.countByAssetId(assetId);
        List<Object[]> breakdownList = reviewRepository.getRatingBreakdownByAssetId(assetId);

        Map<Integer, Long> breakdown = buildBreakdownMap(breakdownList);

        boolean userCanReview = false;
        ReviewResponse currentUserReview = null;

        if (currentEmail != null) {
            Optional<User> userOpt = userRepository.findByEmail(currentEmail);
            if (userOpt.isPresent()) {
                UUID currentUserId = userOpt.get().getId();
                boolean isSeller = asset.getSeller().getId().equals(currentUserId);
                boolean purchased = orderRepository.existsByBuyerIdAndAssetId(currentUserId, assetId);
                userCanReview = !isSeller && purchased;

                Optional<Review> existing = reviewRepository.findByUserIdAndAssetId(currentUserId, assetId);
                if (existing.isPresent()) {
                    currentUserReview = mapToResponse(existing.get());
                }
            }
        }

        return ReviewSummaryDto.builder()
                .averageRating(avg != null ? Math.round(avg * 100.0) / 100.0 : 0.0)
                .totalReviews(total != null ? total : 0)
                .ratingBreakdown(breakdown)
                .userCanReview(userCanReview)
                .currentUserReview(currentUserReview)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getGameReviews(UUID gameId, Pageable pageable) {
        return reviewRepository.findByGameIdOrderByCreatedAtDesc(gameId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getAssetReviews(UUID assetId, Pageable pageable) {
        return reviewRepository.findByAssetIdOrderByCreatedAtDesc(assetId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getAllReviews(Pageable pageable) {
        return reviewRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional
    public void deleteReview(UUID reviewId, String userEmail) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_FOUND));

        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        boolean isAdmin = "admin".equalsIgnoreCase(currentUser.getRole().getName());
        boolean isOwner = review.getUser().getId().equals(currentUser.getId());

        if (!isAdmin && !isOwner) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        Game game = review.getGame();
        Asset asset = review.getAsset();
        User reviewAuthor = review.getUser();

        String productTitle = (game != null) ? game.getTitle() : ((asset != null) ? asset.getTitle() : "sản phẩm");
        String targetId = (game != null) ? game.getId().toString() : ((asset != null) ? asset.getId().toString() : null);

        reviewRepository.delete(review);

        if (game != null) {
            recalculateGameRating(game);
        } else if (asset != null) {
            recalculateAssetRating(asset);
        }

        // Send real-time WebSocket notification if deleted by Admin (and not self-deleted by author)
        if (isAdmin && !isOwner && reviewAuthor != null) {
            String message = "Đánh giá của bạn về sản phẩm \"" + productTitle + "\" đã bị quản trị viên xóa do vi phạm tiêu chuẩn cộng đồng.";
            notificationService.createAndSendNotification(
                    reviewAuthor,
                    currentUser,
                    NotificationType.REVIEW_REMOVED,
                    message,
                    targetId
            );
        }
    }

    private void recalculateGameRating(Game game) {
        Double avg = reviewRepository.getAverageRatingByGameId(game.getId());
        Long count = reviewRepository.countByGameId(game.getId());

        double avgVal = (avg != null) ? avg : 0.0;
        int countVal = (count != null) ? count.intValue() : 0;

        game.setAverageRating(BigDecimal.valueOf(avgVal).setScale(2, RoundingMode.HALF_UP));
        game.setReviewCount(countVal);
        gameRepository.save(game);
    }

    private void recalculateAssetRating(Asset asset) {
        Double avg = reviewRepository.getAverageRatingByAssetId(asset.getId());
        Long count = reviewRepository.countByAssetId(asset.getId());

        double avgVal = (avg != null) ? avg : 0.0;
        int countVal = (count != null) ? count.intValue() : 0;

        asset.setAverageRating(BigDecimal.valueOf(avgVal).setScale(2, RoundingMode.HALF_UP));
        asset.setReviewCount(countVal);
        assetRepository.save(asset);
    }

    private Map<Integer, Long> buildBreakdownMap(List<Object[]> breakdownList) {
        Map<Integer, Long> breakdown = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            breakdown.put(i, 0L);
        }
        if (breakdownList != null) {
            for (Object[] row : breakdownList) {
                Integer star = ((Number) row[0]).intValue();
                Long count = ((Number) row[1]).longValue();
                breakdown.put(star, count);
            }
        }
        return breakdown;
    }

    private ReviewResponse mapToResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .userId(review.getUser().getId())
                .userName(review.getUser().getFullName())
                .userAvatarUrl(review.getUser().getAvatarUrl())
                .gameId(review.getGame() != null ? review.getGame().getId() : null)
                .assetId(review.getAsset() != null ? review.getAsset().getId() : null)
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
