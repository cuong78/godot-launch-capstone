package com.godotlaunch.backend.service;

import com.godotlaunch.backend.entity.enums.ReviewProcessStatus;

import java.util.UUID;

public interface SourceReviewStatusService {
    void updateAiReview(UUID snapshotId, ReviewProcessStatus status, String error);
    void updatePlagiarism(UUID snapshotId, ReviewProcessStatus status, String error);
}
