package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.*;
import com.godotlaunch.backend.repository.ExternalPublishRepository;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/developer/store-games")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
@Tag(name = "Developer Store Reports API", description = "Endpoints cho Developer theo dõi hiệu suất game trên Store và lịch sử nhận chia doanh thu")
public class DeveloperStoreReportController {

    private final StoreReportService storeReportService;
    private final ExternalPublishRepository externalPublishRepository;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Lấy danh sách các game đã phát hành Store của developer hiện tại")
    public ResponseEntity<ApiResponse<List<ExternalPublishResponse>>> getDeveloperStoreGames(Authentication authentication) {
        UUID developerId = getUserId(authentication);
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase("ROLE_ADMIN") || a.getAuthority().equalsIgnoreCase("ADMIN"));

        List<ExternalPublishResponse> response = storeReportService.getDeveloperStoreGames(developerId, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(response, "OK"));
    }

    @GetMapping("/{gameId}/download-metrics")
    @Operation(summary = "Xem thống kê Daily User Installs của 1 game thuộc sở hữu")
    public ResponseEntity<ApiResponse<List<StoreDailyMetricResponse>>> getDailyMetrics(
            @PathVariable UUID gameId,
            Authentication authentication) {
        UUID developerId = getUserId(authentication);
        List<StoreDailyMetricResponse> response = storeReportService.getDailyMetricsByGame(gameId, developerId);
        return ResponseEntity.ok(ApiResponse.success(response, "OK"));
    }

    @GetMapping("/{gameId}/report-imports")
    @Operation(summary = "Xem lịch sử import CSV của 1 game thuộc sở hữu")
    public ResponseEntity<ApiResponse<List<StoreReportImportResponse>>> getReportImports(
            @PathVariable UUID gameId,
            Authentication authentication) {
        UUID developerId = getUserId(authentication);
        List<StoreReportImportResponse> response = storeReportService.getReportImportsByGame(gameId, developerId);
        return ResponseEntity.ok(ApiResponse.success(response, "OK"));
    }

    @GetMapping("/{gameId}/reports/{importId}/download")
    @Operation(summary = "Developer tải file CSV thô đã lọc của game mình")
    public ResponseEntity<byte[]> downloadReportCsv(
            @PathVariable UUID gameId,
            @PathVariable UUID importId,
            Authentication authentication) {
        UUID developerId = getUserId(authentication);
        byte[] csvData = storeReportService.getRawReportCsv(importId, developerId, false);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"store_report_" + gameId + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }

    @GetMapping("/{gameId}/revenue-statements")
    @Operation(summary = "Xem lịch sử chia doanh thu (revenue statements) của 1 game thuộc sở hữu")
    public ResponseEntity<ApiResponse<List<StoreRevenueStatementResponse>>> getRevenueStatements(
            @PathVariable UUID gameId,
            Authentication authentication) {
        UUID developerId = getUserId(authentication);
        List<StoreRevenueStatementResponse> response = storeReportService.getRevenueStatementsByGame(gameId, developerId);
        return ResponseEntity.ok(ApiResponse.success(response, "OK"));
    }

    private UUID getUserId(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName()).orElseThrow().getId();
    }
}
