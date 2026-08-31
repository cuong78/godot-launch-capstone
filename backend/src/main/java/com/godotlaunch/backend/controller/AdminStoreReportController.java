package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.ActivateMockPublishRequest;
import com.godotlaunch.backend.dto.request.GooglePlayMockConfigDto;
import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.repository.UserRepository;
import com.godotlaunch.backend.service.StoreReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin Store Reports & Revenue Share API", description = "Endpoints cho admin quản lý Google Play Mock Publisher, đồng bộ báo cáo và demo payout chia doanh thu")
public class AdminStoreReportController {

    private final StoreReportService storeReportService;
    private final UserRepository userRepository;

    @GetMapping("/platform-settings/google-play-mock")
    @Operation(summary = "Xem cấu hình Publisher Mock hiện tại")
    public ResponseEntity<ApiResponse<GooglePlayMockConfigDto>> getPublisherConfig() {
        return ResponseEntity.ok(ApiResponse.success(storeReportService.getPublisherConfig(), "OK"));
    }

    @PutMapping("/platform-settings/google-play-mock")
    @Operation(summary = "Cấu hình thông tin Publisher Mock (bucket URI, service account email)")
    public ResponseEntity<ApiResponse<GooglePlayMockConfigDto>> updatePublisherConfig(
            @RequestBody GooglePlayMockConfigDto request,
            Authentication authentication) {
        UUID adminId = getUserId(authentication);
        GooglePlayMockConfigDto result = storeReportService.updatePublisherConfig(request, adminId);
        return ResponseEntity.ok(ApiResponse.success(result, "Cấu hình Publisher Mock thành công"));
    }

    @GetMapping("/store-reports/eligible-games")
    @Operation(summary = "Lấy danh sách các game đủ điều kiện phát hành (đã ký hợp đồng hoặc awaiting_store_build)")
    public ResponseEntity<ApiResponse<List<EligibleStoreGameResponse>>> getEligibleStoreGames() {
        return ResponseEntity.ok(ApiResponse.success(storeReportService.getEligibleStoreGames(), "OK"));
    }

    @PostMapping("/store-publishes/{externalPublishId}/activate-mock")
    @Operation(summary = "Admin duyệt & kích hoạt game phát hành lên Google Play Mock (theo externalPublishId)")
    public ResponseEntity<ApiResponse<ExternalPublishResponse>> activateMockPublish(
            @PathVariable UUID externalPublishId,
            @RequestBody ActivateMockPublishRequest request,
            Authentication authentication) {
        UUID adminId = getUserId(authentication);
        ExternalPublishResponse response = storeReportService.activateMockPublish(externalPublishId, request, adminId);
        return ResponseEntity.ok(ApiResponse.success(response, "Kích hoạt Google Play Mock thành công"));
    }

    @PostMapping("/store-reports/games/{gameId}/activate-mock")
    @Operation(summary = "Admin duyệt & kích hoạt game phát hành lên Google Play Mock (theo gameId)")
    public ResponseEntity<ApiResponse<ExternalPublishResponse>> activateMockPublishForGame(
            @PathVariable UUID gameId,
            @RequestBody ActivateMockPublishRequest request,
            Authentication authentication) {
        UUID adminId = getUserId(authentication);
        ExternalPublishResponse response = storeReportService.activateMockPublishForGame(gameId, request, adminId);
        return ResponseEntity.ok(ApiResponse.success(response, "Kích hoạt Google Play Mock cho game thành công"));
    }

    @PostMapping("/store-publishes/{externalPublishId}/sync-downloads")
    @Operation(summary = "Đồng bộ thủ công lượt cài đặt hàng ngày (Manual Sync)")
    public ResponseEntity<ApiResponse<StoreReportImportResponse>> syncDownloads(
            @PathVariable UUID externalPublishId,
            @RequestParam(value = "yyyyMM", required = false) String yyyyMM,
            Authentication authentication) {
        UUID adminId = getUserId(authentication);
        StoreReportImportResponse response = storeReportService.syncDownloadsForGame(externalPublishId, yyyyMM, adminId);
        return ResponseEntity.ok(ApiResponse.success(response, "Đồng bộ report CSV từ Google Play Mock thành công"));
    }

    @PostMapping("/store-publishes/{externalPublishId}/demo-payout")
    @Operation(summary = "Nút Demo nhận doanh thu Google Play và hạch toán chia 85% theo hợp đồng")
    public ResponseEntity<ApiResponse<StoreRevenueStatementResponse>> executeDemoPayout(
            @PathVariable UUID externalPublishId,
            @RequestParam(value = "periodKey", required = false) String periodKey,
            Authentication authentication) {
        UUID adminId = getUserId(authentication);
        StoreRevenueStatementResponse response = storeReportService.executeDemoPayout(externalPublishId, periodKey, adminId);
        return ResponseEntity.ok(ApiResponse.success(response, "Thực hiện Demo payout thành công"));
    }

    @GetMapping("/store-reports/imports")
    @Operation(summary = "Xem lịch sử import report CSV toàn hệ thống")
    public ResponseEntity<ApiResponse<List<StoreReportImportResponse>>> getAllReportImports() {
        return ResponseEntity.ok(ApiResponse.success(storeReportService.getAllReportImports(), "OK"));
    }

    @GetMapping("/store-reports/metrics")
    @Operation(summary = "Xem dữ liệu Daily User Installs toàn hệ thống")
    public ResponseEntity<ApiResponse<List<StoreDailyMetricResponse>>> getAllDailyMetrics() {
        return ResponseEntity.ok(ApiResponse.success(storeReportService.getAllDailyMetrics(), "OK"));
    }

    @GetMapping("/store-reports/imports/{id}/download")
    @Operation(summary = "Tải file CSV thô đã lưu trên SeaweedFS")
    public ResponseEntity<byte[]> downloadRawCsv(@PathVariable UUID id, Authentication authentication) {
        UUID userId = getUserId(authentication);
        byte[] csvData = storeReportService.getRawReportCsv(id, userId, true);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"report_import_" + id + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }

    @GetMapping("/store-revenue-statements")
    @Operation(summary = "Xem danh sách các đợt chia doanh thu (revenue statements)")
    public ResponseEntity<ApiResponse<List<StoreRevenueStatementResponse>>> getAllRevenueStatements() {
        return ResponseEntity.ok(ApiResponse.success(storeReportService.getAllRevenueStatements(), "OK"));
    }

    @GetMapping("/store-revenue-summary")
    @Operation(summary = "Dashboard tổng quan tài chính (Gross, 15% Fee, Net 85%, Dev Payable, Platform Retained)")
    public ResponseEntity<ApiResponse<StoreRevenueSummaryResponse>> getStoreRevenueSummary() {
        return ResponseEntity.ok(ApiResponse.success(storeReportService.getStoreRevenueSummary(), "OK"));
    }

    private UUID getUserId(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName()).orElseThrow().getId();
    }
}
