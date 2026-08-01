package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.response.AiReviewReportResponse;
import com.godotlaunch.backend.dto.response.GameReviewOverviewResponse;

import java.util.List;
import java.util.UUID;

public interface AiReviewQueryService {
    AiReviewReportResponse getLatestForGame(UUID gameId);
    AiReviewReportResponse getLatestForAsset(UUID assetId);
    List<AiReviewReportResponse> getGameHistory(UUID gameId);
    List<AiReviewReportResponse> getAssetHistory(UUID assetId);
    GameReviewOverviewResponse getGameOverview(UUID gameId);
}
