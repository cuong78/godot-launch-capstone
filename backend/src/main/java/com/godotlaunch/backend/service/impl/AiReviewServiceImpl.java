package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.config.AiReviewClient;
import com.godotlaunch.backend.dto.response.AiReviewResult;
import com.godotlaunch.backend.entity.AiReviewReport;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.entity.enums.AiRecommendation;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.repository.AiReviewReportRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.service.AiReviewService;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.GitHubRepoService;
import com.godotlaunch.backend.service.AwsS3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * AI review async — sau snapshot sạch, gọi Python /ai/review rồi lưu ai_review_reports.
 * Fail-soft toàn bộ: lỗi AI KHÔNG ảnh hưởng trạng thái submit (AI chỉ là đề xuất phụ trợ).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiReviewServiceImpl implements AiReviewService {

    private final AiReviewClient aiReviewClient;
    private final AiReviewReportRepository aiReviewReportRepository;
    private final GameRepository gameRepository;
    private final AssetRepository assetRepository;
    private final MediaRepository mediaRepository;
    private final GitHubRepoService gitHubRepoService;
    private final AuditLogService auditLogService;
    private final AwsS3Service awsS3Service;
    private final ObjectMapper objectMapper;

    @Override
    @Async
    @Transactional
    public void reviewGameAsync(UUID gameId) {
        Game game = gameRepository.findById(gameId).orElse(null);
        if (game == null) {
            log.warn("AI review: không tìm thấy game {}", gameId);
            return;
        }
        try {
            String category = game.getCategory() != null ? game.getCategory().getName() : null;
            String token = safeCloneToken(game.getGithubRepoUrl());
            String videoUrl = getPresignedGetUrl(firstGameMediaUrl(gameId, "video"));
            List<String> screenshots = gameMediaUrls(gameId,
                    "screenshot", "thumbnail").stream()
                    .map(this::getPresignedGetUrl)
                    .collect(java.util.stream.Collectors.toList());

            AiReviewResult result = aiReviewClient.review(
                    "code", game.getGithubRepoUrl(), token, game.getGithubBranch(),
                    game.getTitle(), game.getDescription(), category,
                    videoUrl, screenshots);

            if (result == null) return;

            AiReviewReport report = new AiReviewReport();
            report.setGame(game);
            fill(report, result);
            aiReviewReportRepository.save(report);

            auditLogService.publish(
                    game.getCreator().getId(), ActorRole.developer, AuditAction.ai_report_generated,
                    AuditTarget.game, gameId, null, result.getOverallRecommendation(),
                    "AI review game '" + game.getTitle() + "' → đề xuất: "
                            + result.getOverallRecommendation(), null);
            log.info("AI review xong cho game {} → {}", gameId, result.getOverallRecommendation());
        } catch (Exception e) {
            log.error("AI review game {} lỗi (bỏ qua, không chặn submit): {}", gameId, e.getMessage());
        }
    }

    @Override
    @Async
    @Transactional
    public void reviewAssetAsync(UUID itemId) {
        Asset item = assetRepository.findById(itemId).orElse(null);
        if (item == null) {
            log.warn("AI review: không tìm thấy marketplace item {}", itemId);
            return;
        }
        try {
            // Asset = tài nguyên lẻ → AI review chỉ media (CLIP + NSFW), không có repo code.
            String category = item.getCategory() != null ? item.getCategory().getName() : null;
            String videoUrl = getPresignedGetUrl(firstAssetMediaUrl(itemId, "video"));
            List<String> screenshots = assetMediaUrls(itemId,
                    "screenshot", "thumbnail", "asset_image").stream()
                    .map(this::getPresignedGetUrl)
                    .collect(java.util.stream.Collectors.toList());

            AiReviewResult result = aiReviewClient.review(
                    "asset", null, null, null,
                    item.getTitle(), item.getDescription(), category,
                    videoUrl, screenshots);

            if (result == null) return;

            AiReviewReport report = new AiReviewReport();
            report.setAsset(item);
            fill(report, result);
            aiReviewReportRepository.save(report);

            auditLogService.publish(
                    item.getSeller().getId(), ActorRole.developer, AuditAction.ai_report_generated,
                    AuditTarget.marketplace_item, itemId, null, result.getOverallRecommendation(),
                    "AI review item '" + item.getTitle() + "' → đề xuất: "
                            + result.getOverallRecommendation(), null);
            log.info("AI review xong cho item {} → {}", itemId, result.getOverallRecommendation());
        } catch (Exception e) {
            log.error("AI review item {} lỗi (bỏ qua): {}", itemId, e.getMessage());
        }
    }

    private String getPresignedGetUrl(String rawUrl) {
        if (rawUrl == null) return null;
        if (!rawUrl.contains(".amazonaws.com/")) {
            return rawUrl;
        }
        String objectKey = extractObjectKeyFromUrl(rawUrl);
        if (objectKey == null) return rawUrl;
        try {
            return awsS3Service.generatePresignedGetUrl(objectKey, java.time.Duration.ofHours(24));
        } catch (Exception e) {
            log.warn("Failed to generate presigned GET URL for objectKey: {}, returning raw URL. Error: {}", objectKey, e.getMessage());
            return rawUrl;
        }
    }

    private String extractObjectKeyFromUrl(String url) {
        if (url == null) return null;

        // AWS S3
        String awsMarker = ".amazonaws.com/";
        int awsIndex = url.indexOf(awsMarker);
        if (awsIndex != -1) {
            return url.substring(awsIndex + awsMarker.length());
        }

        // SeaweedFS (e.g. http://localhost:8888/godotlaunch/...)
        String seaweedMarker = "/godotlaunch/";
        int seaweedIndex = url.indexOf(seaweedMarker);
        if (seaweedIndex != -1) {
            return url.substring(seaweedIndex + seaweedMarker.length());
        }

        if (url.startsWith("http://") || url.startsWith("https://")) {
            return null;
        }

        return url;
    }

    // ── helpers ─────────────────────────────────────────────────

    /** Map kết quả Python → entity. */
    private void fill(AiReviewReport report, AiReviewResult result) {
        report.setCodeQualityScore(result.getCodeQualityScore());
        report.setMediaMatchScore(result.getMediaMatchScore());
        report.setDescriptionMatchScore(result.getDescriptionMatchScore());
        report.setNsfwFlag(result.isNsfwFlag());
        report.setOverallRecommendation(parseRecommendation(result.getOverallRecommendation()));
        report.setSuggestedPrice(result.getSuggestedPrice());
        report.setSuggestedRevenueSplit(result.getSuggestedRevenueSplit() != null
                ? result.getSuggestedRevenueSplit().shortValue() : null);
        report.setPricingRationale(result.getPricingRationale());
        report.setFlags(toJson(result.getFlags()));
        report.setRawOutput(toJson(result.getRaw()));
    }

    private AiRecommendation parseRecommendation(String s) {
        if (s == null) return AiRecommendation.review;
        try {
            return AiRecommendation.valueOf(s.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            return AiRecommendation.review;
        }
    }

    /** Token clone — null nếu repo public hoặc lỗi (fail-soft, public repo vẫn review được). */
    private String safeCloneToken(String repoUrl) {
        if (repoUrl == null || repoUrl.isBlank()) return null;
        try {
            return gitHubRepoService.getCloneToken(repoUrl);
        } catch (Exception e) {
            return null;
        }
    }

    private String firstGameMediaUrl(UUID gameId, String mediaType) {
        List<Media> list = mediaRepository.findByGame_IdAndMediaType(gameId, mediaType);
        return list.isEmpty() ? null : list.get(0).getMediaUrl();
    }

    private String firstAssetMediaUrl(UUID assetId, String mediaType) {
        List<Media> list = mediaRepository.findByAsset_IdAndMediaType(assetId, mediaType);
        return list.isEmpty() ? null : list.get(0).getMediaUrl();
    }

    private List<String> gameMediaUrls(UUID gameId, String... mediaTypes) {
        List<String> urls = new ArrayList<>();
        for (String type : mediaTypes) {
            for (Media m : mediaRepository.findByGame_IdAndMediaType(gameId, type)) {
                if (m.getMediaUrl() != null) urls.add(m.getMediaUrl());
            }
        }
        return urls;
    }

    private List<String> assetMediaUrls(UUID assetId, String... mediaTypes) {
        List<String> urls = new ArrayList<>();
        for (String type : mediaTypes) {
            for (Media m : mediaRepository.findByAsset_IdAndMediaType(assetId, type)) {
                if (m.getMediaUrl() != null) urls.add(m.getMediaUrl());
            }
        }
        return urls;
    }

    private String toJson(Object obj) {
        try {
            return obj == null ? null : objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return null;
        }
    }
}
