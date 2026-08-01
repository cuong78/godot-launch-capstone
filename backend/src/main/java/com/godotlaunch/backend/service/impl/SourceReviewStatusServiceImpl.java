package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.entity.SourceSnapshot;
import com.godotlaunch.backend.entity.enums.ReviewProcessStatus;
import com.godotlaunch.backend.repository.SourceSnapshotRepository;
import com.godotlaunch.backend.service.SourceReviewStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SourceReviewStatusServiceImpl implements SourceReviewStatusService {

    private static final int MAX_ERROR_LENGTH = 2_000;

    private final SourceSnapshotRepository sourceSnapshotRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateAiReview(UUID snapshotId, ReviewProcessStatus status, String error) {
        SourceSnapshot snapshot = requireSnapshot(snapshotId);
        snapshot.setAiReviewStatus(status);
        snapshot.setAiReviewError(normalizeError(error));
        snapshot.setAiReviewCompletedAt(isTerminal(status) ? Instant.now() : null);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updatePlagiarism(UUID snapshotId, ReviewProcessStatus status, String error) {
        SourceSnapshot snapshot = requireSnapshot(snapshotId);
        snapshot.setPlagiarismStatus(status);
        snapshot.setPlagiarismError(normalizeError(error));
        snapshot.setPlagiarismCompletedAt(isTerminal(status) ? Instant.now() : null);
    }

    private SourceSnapshot requireSnapshot(UUID snapshotId) {
        return sourceSnapshotRepository.findById(snapshotId)
                .orElseThrow(() -> new IllegalArgumentException("Source snapshot not found: " + snapshotId));
    }

    private boolean isTerminal(ReviewProcessStatus status) {
        return status == ReviewProcessStatus.completed || status == ReviewProcessStatus.failed;
    }

    private String normalizeError(String error) {
        if (error == null || error.isBlank()) return null;
        String trimmed = error.trim();
        return trimmed.length() <= MAX_ERROR_LENGTH ? trimmed : trimmed.substring(0, MAX_ERROR_LENGTH);
    }
}
