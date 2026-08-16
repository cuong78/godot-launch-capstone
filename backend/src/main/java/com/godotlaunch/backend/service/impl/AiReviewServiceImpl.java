package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.config.AiReviewClient;
import com.godotlaunch.backend.dto.response.AiReviewResult;
import com.godotlaunch.backend.entity.AiReviewReport;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.Media;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.entity.enums.ActorRole;
import com.godotlaunch.backend.entity.enums.AiRecommendation;
import com.godotlaunch.backend.entity.enums.AuditAction;
import com.godotlaunch.backend.entity.enums.AuditTarget;
import com.godotlaunch.backend.entity.enums.ReviewProcessStatus;
import com.godotlaunch.backend.repository.AiReviewReportRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.AssetRepository;
import com.godotlaunch.backend.repository.MediaRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.service.AiReviewService;
import com.godotlaunch.backend.service.AuditLogService;
import com.godotlaunch.backend.service.PlagiarismService;
import com.godotlaunch.backend.service.SourceReviewStatusService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * AI review async — sau snapshot sạch, gửi đúng immutable bundle của snapshot sang
 * Python /ai/review rồi lưu ai_review_reports liên kết với snapshot đó.
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
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final AuditLogService auditLogService;
    private final PlagiarismService plagiarismService;
    private final SourceReviewStatusService sourceReviewStatusService;
    private final ObjectMapper objectMapper;

    @Override
    @Async
    public void reviewGameAsync(UUID gameId) {
        SourceSnapshot latestSnapshot = sourceSnapshotRepository
                .findFirstByGameIdOrderByCreatedAtDesc(gameId)
                .orElse(null);
        if (latestSnapshot == null) {
            log.warn("AI review: game {} chưa có source snapshot", gameId);
            return;
        }
        reviewGameSnapshot(gameId, latestSnapshot.getId());
    }

    @Override
    @Async
    public void reviewGameSnapshotAsync(UUID gameId, UUID snapshotId) {
        reviewGameSnapshot(gameId, snapshotId);
    }

    private void reviewGameSnapshot(UUID gameId, UUID snapshotId) {
        Game game = gameRepository.findForAiReviewById(gameId).orElse(null);
        if (game == null) {
            log.warn("AI review: không tìm thấy game {}", gameId);
            return;
        }
        SourceSnapshot snapshot = sourceSnapshotRepository.findForReviewById(snapshotId).orElse(null);
        if (snapshot == null || snapshot.getGame() == null
                || !gameId.equals(snapshot.getGame().getId())) {
            log.warn("AI review: snapshot {} không thuộc game {}", snapshotId, gameId);
            return;
        }
        if (snapshot.getBundleUrl() == null || snapshot.getBundleUrl().isBlank()) {
            log.warn("AI review: snapshot {} không có source bundle", snapshotId);
            sourceReviewStatusService.updateAiReview(
                    snapshotId, ReviewProcessStatus.failed, "Source snapshot has no immutable bundle URL");
            sourceReviewStatusService.updatePlagiarism(
                    snapshotId, ReviewProcessStatus.failed, "Source snapshot has no immutable bundle URL");
            return;
        }

        boolean runPlagiarism = snapshot.getPlagiarismStatus() != ReviewProcessStatus.completed;
        sourceReviewStatusService.updateAiReview(snapshotId, ReviewProcessStatus.running, null);
        if (runPlagiarism) {
            sourceReviewStatusService.updatePlagiarism(snapshotId, ReviewProcessStatus.pending, null);
        }
        try {
            String category = game.getCategory() != null ? game.getCategory().getName() : null;
            String videoUrl = getPresignedGetUrl(firstGameMediaUrl(gameId, "video"));
            List<String> screenshots = gameMediaUrls(gameId,
                    "screenshot", "thumbnail", "image").stream()
                    .map(this::getPresignedGetUrl)
                    .collect(java.util.stream.Collectors.toList());

            if (game.getThumbnailUrl() != null && !game.getThumbnailUrl().isBlank()) {
                String thumbPresigned = getPresignedGetUrl(game.getThumbnailUrl());
                if (!screenshots.contains(thumbPresigned)) {
                    screenshots.add(0, thumbPresigned);
                }
            }

            List<String> tags = game.getTags() == null ? List.of() :
                    game.getTags().stream().map(com.godotlaunch.backend.entity.Tag::getName).toList();

            String currentTitle = (snapshot.getPendingTitle() != null && !snapshot.getPendingTitle().isBlank())
                    ? snapshot.getPendingTitle() : game.getTitle();
            String currentDescription = (snapshot.getPendingDescription() != null && !snapshot.getPendingDescription().isBlank())
                    ? snapshot.getPendingDescription() : game.getDescription();
            List<String> currentTags = parsePendingTags(snapshot.getPendingTags(), tags);

            SourceSnapshot previousSnapshot = sourceSnapshotRepository
                    .findFirstByGameIdAndIdNotOrderByCreatedAtDesc(gameId, snapshotId)
                    .orElse(null);
            boolean hasPendingChanges = (snapshot.getPendingTitle() != null && !snapshot.getPendingTitle().isBlank() && !snapshot.getPendingTitle().equals(game.getTitle()))
                    || (snapshot.getPendingDescription() != null && !snapshot.getPendingDescription().isBlank() && !snapshot.getPendingDescription().equals(game.getDescription()))
                    || (snapshot.getPendingTags() != null && !snapshot.getPendingTags().isBlank());
            boolean isUpdate = previousSnapshot != null || hasPendingChanges;
            String oldBundleUrl = previousSnapshot != null ? previousSnapshot.getBundleUrl() : null;

            String oldTitle = null;
            String oldDescription = null;
            List<String> oldTags = null;

            if (isUpdate) {
                if (snapshot.getPendingTitle() != null && !snapshot.getPendingTitle().isBlank() && !snapshot.getPendingTitle().equals(game.getTitle())) {
                    oldTitle = game.getTitle();
                } else if (previousSnapshot != null && previousSnapshot.getPendingTitle() != null && !previousSnapshot.getPendingTitle().isBlank()) {
                    oldTitle = previousSnapshot.getPendingTitle();
                } else {
                    oldTitle = game.getTitle();
                }

                if (snapshot.getPendingDescription() != null && !snapshot.getPendingDescription().isBlank() && !snapshot.getPendingDescription().equals(game.getDescription())) {
                    oldDescription = game.getDescription();
                } else if (previousSnapshot != null && previousSnapshot.getPendingDescription() != null && !previousSnapshot.getPendingDescription().isBlank()) {
                    oldDescription = previousSnapshot.getPendingDescription();
                } else {
                    oldDescription = game.getDescription();
                }

                if (snapshot.getPendingTags() != null && !snapshot.getPendingTags().isBlank()) {
                    oldTags = tags;
                } else if (previousSnapshot != null) {
                    oldTags = parsePendingTags(previousSnapshot.getPendingTags(), tags);
                } else {
                    oldTags = tags;
                }
            }

            AiReviewResult result = aiReviewClient.review(
                    "code", snapshot.getId(), snapshot.getBundleUrl(), snapshot.getBundleHash(),
                    snapshot.getCommitSha(),
                    currentTitle, currentDescription, category,
                    videoUrl, screenshots, currentTags,
                    isUpdate, oldBundleUrl, oldTitle, oldDescription, oldTags);

            if (result == null) {
                throw new IllegalStateException("AI review service returned no result");
            }

            AiReviewReport report = new AiReviewReport();
            report.setGame(game);
            report.setSourceSnapshot(snapshot);
            fill(report, result);
            aiReviewReportRepository.save(report);
            sourceReviewStatusService.updateAiReview(snapshotId, ReviewProcessStatus.completed, null);

            auditLogService.publish(
                    game.getCreator().getId(), ActorRole.developer, AuditAction.ai_report_generated,
                    AuditTarget.game, gameId, null, result.getOverallRecommendation(),
                    "AI review game '" + game.getTitle() + "' → đề xuất: "
                            + result.getOverallRecommendation(), null);
            log.info("AI review xong cho game {}, snapshot {} → {}",
                    gameId, snapshotId, result.getOverallRecommendation());
        } catch (Exception e) {
            sourceReviewStatusService.updateAiReview(
                    snapshotId, ReviewProcessStatus.failed, rootMessage(e));
            log.error("AI review game {}, snapshot {} lỗi (bỏ qua, không chặn submit): {}",
                    gameId, snapshotId, e.getMessage());
        }

        // Plagiarism là bước độc lập: AI review nội tại lỗi vẫn không được làm mất
        // cơ hội kiểm tra tương đồng source của cùng snapshot.
        if (runPlagiarism) {
            plagiarismService.reviewSnapshot(gameId, snapshotId);
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

            if (item.getThumbnailUrl() != null && !item.getThumbnailUrl().isBlank()) {
                String thumbPresigned = getPresignedGetUrl(item.getThumbnailUrl());
                if (!screenshots.contains(thumbPresigned)) {
                    screenshots.add(0, thumbPresigned);
                }
            }

            List<String> tags = item.getTags() == null ? List.of() :
                    item.getTags().stream().map(com.godotlaunch.backend.entity.Tag::getName).toList();

            AiReviewResult result = aiReviewClient.review(
                    "asset", null, null, null, null,
                    item.getTitle(), item.getDescription(), category,
                    videoUrl, screenshots, tags);

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
        return rawUrl;
    }

    // ── helpers ─────────────────────────────────────────────────

    /** Map kết quả Python → entity. */
    private void fill(AiReviewReport report, AiReviewResult result) {
        report.setCodeQualityScore(result.getCodeQualityScore());
        report.setMediaMatchScore(result.getMediaMatchScore());
        report.setDescriptionMatchScore(result.getDescriptionMatchScore());
        report.setTagsMatchScore(result.getTagsMatchScore());
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

    private List<String> parsePendingTags(String pendingTagsJson, List<String> fallback) {
        if (pendingTagsJson == null || pendingTagsJson.isBlank()) {
            return fallback;
        }
        try {
            return objectMapper.readValue(pendingTagsJson, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        } catch (Exception e) {
            return fallback;
        }
    }

    private String rootMessage(Exception error) {
        Throwable current = error;
        while (current.getCause() != null) current = current.getCause();
        return current.getMessage() == null ? error.getClass().getSimpleName() : current.getMessage();
    }
}
