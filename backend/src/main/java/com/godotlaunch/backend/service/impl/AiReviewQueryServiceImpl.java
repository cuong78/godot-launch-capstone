package com.godotlaunch.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.dto.response.AiReviewReportResponse;
import com.godotlaunch.backend.dto.response.GameReviewOverviewResponse;
import com.godotlaunch.backend.dto.response.PlagiarismFlagResponse;
import com.godotlaunch.backend.entity.AiReviewReport;
import com.godotlaunch.backend.entity.PlagiarismFlag;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.repository.AiReviewReportRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.PlagiarismFlagRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.service.AiReviewQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiReviewQueryServiceImpl implements AiReviewQueryService {

    private final AiReviewReportRepository aiReviewReportRepository;
    private final PlagiarismFlagRepository plagiarismFlagRepository;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final GameRepository gameRepository;
    private final ObjectMapper objectMapper;

    @Override
    public AiReviewReportResponse getLatestForGame(UUID gameId) {
        return aiReviewReportRepository.findFirstByGameIdOrderByCreatedAtDesc(gameId)
                .map(this::mapReport).orElse(null);
    }

    @Override
    public AiReviewReportResponse getLatestForAsset(UUID assetId) {
        return aiReviewReportRepository.findFirstByAssetIdOrderByCreatedAtDesc(assetId)
                .map(this::mapReport).orElse(null);
    }

    @Override
    public List<AiReviewReportResponse> getGameHistory(UUID gameId) {
        return aiReviewReportRepository.findByGameIdOrderByCreatedAtDesc(gameId)
                .stream().map(this::mapReport).toList();
    }

    @Override
    public List<AiReviewReportResponse> getAssetHistory(UUID assetId) {
        return aiReviewReportRepository.findByAssetIdOrderByCreatedAtDesc(assetId)
                .stream().map(this::mapReport).toList();
    }

    @Override
    public GameReviewOverviewResponse getGameOverview(UUID gameId) {
        if (!gameRepository.existsById(gameId)) {
            throw new IllegalArgumentException("Game not found: " + gameId);
        }
        SourceSnapshot snapshot = sourceSnapshotRepository
                .findFirstByGameIdOrderByCreatedAtDesc(gameId).orElse(null);
        if (snapshot == null) {
            return GameReviewOverviewResponse.builder()
                    .gameId(gameId)
                    .plagiarismFlags(List.of())
                    .build();
        }

        AiReviewReportResponse report = aiReviewReportRepository
                .findFirstBySourceSnapshotIdOrderByCreatedAtDesc(snapshot.getId())
                .map(this::mapReport).orElse(null);
        List<PlagiarismFlagResponse> flags = plagiarismFlagRepository
                .findBySourceSnapshotIdOrderBySimilarityScoreDesc(snapshot.getId())
                .stream().map(this::mapPlagiarismFlag).toList();

        return GameReviewOverviewResponse.builder()
                .gameId(gameId)
                .sourceSnapshotId(snapshot.getId())
                .commitSha(snapshot.getCommitSha())
                .aiReviewStatus(snapshot.getAiReviewStatus().name())
                .aiReviewError(snapshot.getAiReviewError())
                .aiReviewCompletedAt(snapshot.getAiReviewCompletedAt())
                .plagiarismStatus(snapshot.getPlagiarismStatus().name())
                .plagiarismError(snapshot.getPlagiarismError())
                .plagiarismCompletedAt(snapshot.getPlagiarismCompletedAt())
                .report(report)
                .plagiarismFlags(flags)
                .build();
    }

    private AiReviewReportResponse mapReport(AiReviewReport report) {
        return AiReviewReportResponse.builder()
                .id(report.getId())
                .gameId(report.getGame() != null ? report.getGame().getId() : null)
                .assetId(report.getAsset() != null ? report.getAsset().getId() : null)
                .sourceSnapshotId(report.getSourceSnapshot() != null ? report.getSourceSnapshot().getId() : null)
                .commitSha(report.getSourceSnapshot() != null ? report.getSourceSnapshot().getCommitSha() : null)
                .codeQualityScore(report.getCodeQualityScore())
                .mediaMatchScore(report.getMediaMatchScore())
                .descriptionMatchScore(report.getDescriptionMatchScore())
                .tagsMatchScore(report.getTagsMatchScore())
                .nsfwFlag(report.isNsfwFlag())
                .overallRecommendation(report.getOverallRecommendation() != null
                        ? report.getOverallRecommendation().name() : null)
                .suggestedPrice(report.getSuggestedPrice())
                .suggestedRevenueSplit(report.getSuggestedRevenueSplit())
                .pricingRationale(report.getPricingRationale())
                .flags(parseJson(report.getFlags()))
                .rawOutput(parseJson(report.getRawOutput()))
                .createdAt(report.getCreatedAt())
                .build();
    }

    private PlagiarismFlagResponse mapPlagiarismFlag(PlagiarismFlag flag) {
        return PlagiarismFlagResponse.builder()
                .id(flag.getId())
                .gameId(flag.getGame().getId())
                .gameTitle(flag.getGame().getTitle())
                .matchedGameId(flag.getMatchedGame().getId())
                .matchedGameTitle(flag.getMatchedGame().getTitle())
                .sourceSnapshotId(flag.getSourceSnapshot().getId())
                .sourceCommitSha(flag.getSourceSnapshot().getCommitSha())
                .matchedSourceSnapshotId(flag.getMatchedSourceSnapshot().getId())
                .matchedCommitSha(flag.getMatchedSourceSnapshot().getCommitSha())
                .codeEmbeddingId(flag.getCodeEmbedding().getId())
                .matchedCodeEmbeddingId(flag.getMatchedCodeEmbedding().getId())
                .similarityScore(flag.getSimilarityScore())
                .severity(flag.getSeverity().name())
                .modelName(flag.getModelName())
                .modelVersion(flag.getModelVersion())
                .reviewThreshold(flag.getReviewThreshold())
                .rejectThreshold(flag.getRejectThreshold())
                .reviewedByAdmin(flag.isReviewedByAdmin())
                .createdAt(flag.getCreatedAt())
                .build();
    }

    private JsonNode parseJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (Exception ignored) {
            return null;
        }
    }
}
