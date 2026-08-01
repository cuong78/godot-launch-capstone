package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.AiReviewReportResponse;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.GameReviewOverviewResponse;
import io.swagger.v3.oas.annotations.Operation;
import com.godotlaunch.backend.service.AiReviewQueryService;
import com.godotlaunch.backend.service.AiReviewService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Admin xem AI review report (ĐỀ XUẤT của AI). Admin quyết định duyệt/từ chối cuối cùng.
 */
@RestController
@RequestMapping("/api/v1/admin/ai-reviews")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin AI Review API", description = "Admin xem báo cáo AI review multimodal (đề xuất)")
public class AdminAiReviewController {

    private final AiReviewService aiReviewService;
    private final AiReviewQueryService aiReviewQueryService;

    @PostMapping("/game/{gameId}/trigger")
    @Operation(summary = "Kích hoạt chạy AI Review thủ công cho game (Admin only)")
    public ResponseEntity<ApiResponse<String>> triggerGameReview(@PathVariable UUID gameId) {
        aiReviewService.reviewGameAsync(gameId);
        return ResponseEntity.ok(ApiResponse.success("AI review triggered successfully in background", "OK"));
    }

    @PostMapping("/asset/{itemId}/trigger")
    @Operation(summary = "Kích hoạt chạy AI Review thủ công cho marketplace item (Admin only)")
    public ResponseEntity<ApiResponse<String>> triggerItemReview(@PathVariable UUID itemId) {
        aiReviewService.reviewAssetAsync(itemId);
        return ResponseEntity.ok(ApiResponse.success("AI review triggered successfully in background", "OK"));
    }

    @GetMapping("/game/{gameId}")
    @Operation(summary = "AI report mới nhất của game",
            description = "Trả report AI mới nhất cho 1 game để admin tham khảo khi duyệt.")
    public ResponseEntity<ApiResponse<AiReviewReportResponse>> getLatestForGame(@PathVariable UUID gameId) {
        AiReviewReportResponse report = aiReviewQueryService.getLatestForGame(gameId);
        return ResponseEntity.ok(ApiResponse.success(report,
                report == null ? "Chưa có AI report" : "OK"));
    }

    @GetMapping("/asset/{itemId}")
    @Operation(summary = "AI report mới nhất của marketplace item")
    public ResponseEntity<ApiResponse<AiReviewReportResponse>> getLatestForItem(@PathVariable UUID itemId) {
        AiReviewReportResponse report = aiReviewQueryService.getLatestForAsset(itemId);
        return ResponseEntity.ok(ApiResponse.success(report,
                report == null ? "Chưa có AI report" : "OK"));
    }

    @GetMapping("/game/{gameId}/overview")
    @Operation(summary = "Trạng thái AI Review và plagiarism của snapshot mới nhất")
    public ResponseEntity<ApiResponse<GameReviewOverviewResponse>> getGameOverview(@PathVariable UUID gameId) {
        return ResponseEntity.ok(ApiResponse.success(
                aiReviewQueryService.getGameOverview(gameId), "OK"));
    }

    @GetMapping("/game/{gameId}/history")
    @Operation(summary = "Lịch sử AI report của game (mỗi lần re-submit)")
    public ResponseEntity<ApiResponse<List<AiReviewReportResponse>>> getHistoryForGame(@PathVariable UUID gameId) {
        return ResponseEntity.ok(ApiResponse.success(aiReviewQueryService.getGameHistory(gameId), "OK"));
    }

    @GetMapping("/asset/{itemId}/history")
    @Operation(summary = "Lịch sử AI report của marketplace item")
    public ResponseEntity<ApiResponse<List<AiReviewReportResponse>>> getHistoryForItem(@PathVariable UUID itemId) {
        return ResponseEntity.ok(ApiResponse.success(aiReviewQueryService.getAssetHistory(itemId), "OK"));
    }
}
