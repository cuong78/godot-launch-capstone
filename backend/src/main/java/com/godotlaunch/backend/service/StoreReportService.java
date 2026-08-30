package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.ActivateMockPublishRequest;
import com.godotlaunch.backend.dto.request.GooglePlayMockConfigDto;
import com.godotlaunch.backend.dto.response.*;

import java.util.List;
import java.util.UUID;

public interface StoreReportService {
    GooglePlayMockConfigDto updatePublisherConfig(GooglePlayMockConfigDto configDto, UUID adminId);
    GooglePlayMockConfigDto getPublisherConfig();

    List<EligibleStoreGameResponse> getEligibleStoreGames();
    ExternalPublishResponse activateMockPublish(UUID externalPublishId, ActivateMockPublishRequest request, UUID adminId);
    ExternalPublishResponse activateMockPublishForGame(UUID gameId, ActivateMockPublishRequest request, UUID adminId);
    StoreReportImportResponse syncDownloadsForGame(UUID externalPublishId, UUID adminId);
    void syncAllActiveGamesDownloads();

    StoreRevenueStatementResponse executeDemoPayout(UUID externalPublishId, String periodKey, UUID adminId);

    List<StoreReportImportResponse> getAllReportImports();
    List<StoreReportImportResponse> getReportImportsByGame(UUID gameId, UUID developerId);

    List<StoreDailyMetricResponse> getAllDailyMetrics();
    List<StoreDailyMetricResponse> getDailyMetricsByGame(UUID gameId, UUID developerId);

    List<StoreRevenueStatementResponse> getAllRevenueStatements();
    List<StoreRevenueStatementResponse> getRevenueStatementsByGame(UUID gameId, UUID developerId);

    List<ExternalPublishResponse> getDeveloperStoreGames(UUID developerId, boolean isAdmin);
    StoreRevenueSummaryResponse getStoreRevenueSummary();
    byte[] getRawReportCsv(UUID importId, UUID userId, boolean isAdmin);
}
