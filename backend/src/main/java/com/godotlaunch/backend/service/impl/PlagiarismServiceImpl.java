package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.config.CodeEmbeddingClient;
import com.godotlaunch.backend.dto.response.CodeEmbeddingResult;
import com.godotlaunch.backend.entity.CodeEmbedding;
import com.godotlaunch.backend.entity.Game;
import com.godotlaunch.backend.entity.PlagiarismFlag;
import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.entity.enums.PlagiarismSeverity;
import com.godotlaunch.backend.entity.enums.ReviewProcessStatus;
import com.godotlaunch.backend.repository.CodeEmbeddingMatchProjection;
import com.godotlaunch.backend.repository.CodeEmbeddingRepository;
import com.godotlaunch.backend.repository.GameRepository;
import com.godotlaunch.backend.repository.PlagiarismFlagRepository;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.service.PlagiarismService;
import com.godotlaunch.backend.service.SourceReviewStatusService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlagiarismServiceImpl implements PlagiarismService {

    private static final int EXPECTED_DIMENSIONS = 768;

    private final CodeEmbeddingClient codeEmbeddingClient;
    private final CodeEmbeddingRepository codeEmbeddingRepository;
    private final PlagiarismFlagRepository plagiarismFlagRepository;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final GameRepository gameRepository;
    private final SourceReviewStatusService sourceReviewStatusService;
    private final PlatformTransactionManager transactionManager;

    @Value("${app.ai-review.plagiarism.review-threshold:0.70}")
    private float reviewThreshold;

    @Value("${app.ai-review.plagiarism.reject-threshold:0.90}")
    private float rejectThreshold;

    @Value("${app.ai-review.plagiarism.top-n:10}")
    private int topN;

    @Override
    public void reviewSnapshot(UUID gameId, UUID snapshotId) {
        try {
            if (!gameRepository.existsById(gameId)) {
                throw new IllegalArgumentException("Game not found: " + gameId);
            }
            SourceSnapshot snapshot = sourceSnapshotRepository.findForReviewById(snapshotId)
                    .orElseThrow(() -> new IllegalArgumentException("Source snapshot not found: " + snapshotId));
            if (snapshot.getPlagiarismStatus() == ReviewProcessStatus.completed) {
                log.info("Bỏ qua plagiarism snapshot {} vì kết quả bất biến đã hoàn tất", snapshotId);
                return;
            }
            if (snapshot.getGame() == null || !gameId.equals(snapshot.getGame().getId())) {
                throw new IllegalArgumentException("Source snapshot does not belong to game");
            }
            if (snapshot.getBundleUrl() == null || snapshot.getBundleUrl().isBlank()) {
                throw new IllegalStateException("Source snapshot has no immutable bundle URL");
            }

            sourceReviewStatusService.updatePlagiarism(snapshotId, ReviewProcessStatus.running, null);

            CodeEmbeddingResult result = codeEmbeddingClient.createEmbedding(
                    snapshotId, snapshot.getBundleUrl(), snapshot.getBundleHash());
            validateResult(result);

            TransactionTemplate persistenceTransaction = new TransactionTemplate(transactionManager);
            persistenceTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            Integer matchCount = persistenceTransaction.execute(
                    status -> persistEmbeddingAndFlags(gameId, snapshotId, result));

            sourceReviewStatusService.updatePlagiarism(snapshotId, ReviewProcessStatus.completed, null);
            log.info("Plagiarism check xong cho game {}, snapshot {}: {} ứng viên",
                    gameId, snapshotId, matchCount == null ? 0 : matchCount);
        } catch (Exception e) {
            sourceReviewStatusService.updatePlagiarism(snapshotId, ReviewProcessStatus.failed, rootMessage(e));
            log.error("Plagiarism check lỗi cho game {}, snapshot {}: {}", gameId, snapshotId, e.getMessage(), e);
        }
    }

    private int persistEmbeddingAndFlags(UUID gameId, UUID snapshotId, CodeEmbeddingResult result) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found: " + gameId));
        SourceSnapshot snapshot = sourceSnapshotRepository.findById(snapshotId)
                .orElseThrow(() -> new IllegalArgumentException("Source snapshot not found: " + snapshotId));

        CodeEmbedding current = codeEmbeddingRepository
                .findBySourceSnapshotIdAndModelNameAndModelVersion(
                        snapshotId, result.getModelName(), result.getModelVersion())
                .orElseGet(() -> saveEmbedding(game, snapshot, result));

        List<CodeEmbeddingMatchProjection> matches = codeEmbeddingRepository.findClosestFromOtherGames(
                gameId,
                current.getModelName(),
                current.getModelVersion(),
                toVectorLiteral(current.getEmbedding()),
                Math.max(1, topN));

        for (CodeEmbeddingMatchProjection match : matches) {
            float score = clamp(match.getSimilarityScore());
            if (score < reviewThreshold) continue;

            CodeEmbedding matched = codeEmbeddingRepository.findById(match.getEmbeddingId())
                    .orElseThrow(() -> new IllegalStateException("Matched embedding disappeared"));
            saveFlagIfAbsent(current, matched, score);
        }
        return matches.size();
    }

    private CodeEmbedding saveEmbedding(Game game, SourceSnapshot snapshot, CodeEmbeddingResult result) {
        CodeEmbedding embedding = new CodeEmbedding();
        embedding.setGame(game);
        embedding.setSourceSnapshot(snapshot);
        embedding.setEmbedding(toFloatArray(result.getEmbedding()));
        embedding.setModelName(result.getModelName());
        embedding.setModelVersion(result.getModelVersion());
        return codeEmbeddingRepository.saveAndFlush(embedding);
    }

    private void saveFlagIfAbsent(CodeEmbedding current, CodeEmbedding matched, float score) {
        if (plagiarismFlagRepository
                .findByCodeEmbeddingIdAndMatchedCodeEmbeddingId(current.getId(), matched.getId())
                .isPresent()) {
            return;
        }

        PlagiarismFlag flag = new PlagiarismFlag();
        flag.setGame(current.getGame());
        flag.setMatchedGame(matched.getGame());
        flag.setCodeEmbedding(current);
        flag.setMatchedCodeEmbedding(matched);
        flag.setSourceSnapshot(current.getSourceSnapshot());
        flag.setMatchedSourceSnapshot(matched.getSourceSnapshot());
        flag.setSimilarityScore(score);
        flag.setModelName(current.getModelName());
        flag.setModelVersion(current.getModelVersion());
        flag.setReviewThreshold(reviewThreshold);
        flag.setRejectThreshold(rejectThreshold);
        flag.setSeverity(score >= rejectThreshold ? PlagiarismSeverity.reject : PlagiarismSeverity.review);
        plagiarismFlagRepository.save(flag);
    }

    private void validateResult(CodeEmbeddingResult result) {
        if (result == null || result.getEmbedding() == null) {
            throw new IllegalStateException("AI service returned an empty embedding");
        }
        if (result.getEmbedding().size() != EXPECTED_DIMENSIONS
                || result.getDimensions() == null
                || result.getDimensions() != EXPECTED_DIMENSIONS) {
            throw new IllegalStateException("Expected a 768-dimensional code embedding");
        }
        if (result.getModelName() == null || result.getModelName().isBlank()
                || result.getModelVersion() == null || result.getModelVersion().isBlank()) {
            throw new IllegalStateException("Embedding model metadata is missing");
        }
        if (!(reviewThreshold >= 0 && reviewThreshold < rejectThreshold && rejectThreshold <= 1)) {
            throw new IllegalStateException("Invalid plagiarism thresholds");
        }
    }

    private float clamp(Float score) {
        if (score == null || Float.isNaN(score)) return 0;
        return Math.max(0, Math.min(1, score));
    }

    private float[] toFloatArray(List<Float> values) {
        float[] vector = new float[values.size()];
        for (int index = 0; index < values.size(); index++) {
            Float value = values.get(index);
            if (value == null || !Float.isFinite(value)) {
                throw new IllegalStateException("AI service returned a non-finite embedding value");
            }
            vector[index] = value;
        }
        return vector;
    }

    /** PostgreSQL pgvector text input, consumed by CAST(:embedding AS vector). */
    private String toVectorLiteral(float[] values) {
        StringBuilder literal = new StringBuilder(values.length * 12).append('[');
        for (int index = 0; index < values.length; index++) {
            if (index > 0) literal.append(',');
            literal.append(Float.toString(values[index]));
        }
        return literal.append(']').toString();
    }

    private String rootMessage(Exception error) {
        Throwable current = error;
        while (current.getCause() != null) current = current.getCause();
        return current.getMessage() == null ? error.getClass().getSimpleName() : current.getMessage();
    }
}
