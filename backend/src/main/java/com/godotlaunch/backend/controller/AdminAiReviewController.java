package com.godotlaunch.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.godotlaunch.backend.dto.response.AiReviewReportResponse;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.entity.AiReviewReport;
import com.godotlaunch.backend.repository.AiReviewReportRepository;
import io.swagger.v3.oas.annotations.Operation;
import com.godotlaunch.backend.service.AiReviewService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
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

    private final AiReviewReportRepository aiReviewReportRepository;
    private final ObjectMapper objectMapper;
    private final AiReviewService aiReviewService;

    @PostMapping("/game/{gameId}/trigger")
    @Operation(summary = "Kích hoạt chạy AI Review thủ công cho game (Admin only)")
    public ResponseEntity<ApiResponse<String>> triggerGameReview(@PathVariable UUID gameId) {
        aiReviewService.reviewGameAsync(gameId);
        return ResponseEntity.ok(ApiResponse.success("AI review triggered successfully in background", "OK"));
    }

    @PostMapping("/marketplace-item/{itemId}/trigger")
    @Operation(summary = "Kích hoạt chạy AI Review thủ công cho marketplace item (Admin only)")
    public ResponseEntity<ApiResponse<String>> triggerItemReview(@PathVariable UUID itemId) {
        aiReviewService.reviewMarketplaceItemAsync(itemId);
        return ResponseEntity.ok(ApiResponse.success("AI review triggered successfully in background", "OK"));
    }

    @GetMapping("/game/{gameId}")
    @Transactional(readOnly = true)
    @Operation(summary = "AI report mới nhất của game",
            description = "Trả report AI mới nhất cho 1 game để admin tham khảo khi duyệt.")
    public ResponseEntity<ApiResponse<AiReviewReportResponse>> getLatestForGame(@PathVariable UUID gameId) {
        return aiReviewReportRepository.findFirstByGameIdOrderByCreatedAtDesc(gameId)
                .map(r -> ResponseEntity.ok(ApiResponse.success(map(r), "OK")))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.success(null, "Chưa có AI report")));
    }

    @GetMapping("/marketplace-item/{itemId}")
    @Transactional(readOnly = true)
    @Operation(summary = "AI report mới nhất của marketplace item")
    public ResponseEntity<ApiResponse<AiReviewReportResponse>> getLatestForItem(@PathVariable UUID itemId) {
        return aiReviewReportRepository.findFirstByMarketplaceItemIdOrderByCreatedAtDesc(itemId)
                .map(r -> ResponseEntity.ok(ApiResponse.success(map(r), "OK")))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.success(null, "Chưa có AI report")));
    }

    @GetMapping("/game/{gameId}/history")
    @Transactional(readOnly = true)
    @Operation(summary = "Lịch sử AI report của game (mỗi lần re-submit)")
    public ResponseEntity<ApiResponse<List<AiReviewReportResponse>>> getHistoryForGame(@PathVariable UUID gameId) {
        List<AiReviewReportResponse> list = aiReviewReportRepository
                .findByGameIdOrderByCreatedAtDesc(gameId).stream().map(this::map).toList();
        return ResponseEntity.ok(ApiResponse.success(list, "OK"));
    }

    @GetMapping("/marketplace-item/{itemId}/history")
    @Transactional(readOnly = true)
    @Operation(summary = "Lịch sử AI report của marketplace item")
    public ResponseEntity<ApiResponse<List<AiReviewReportResponse>>> getHistoryForItem(@PathVariable UUID itemId) {
        List<AiReviewReportResponse> list = aiReviewReportRepository
                .findByMarketplaceItemIdOrderByCreatedAtDesc(itemId).stream().map(this::map).toList();
        return ResponseEntity.ok(ApiResponse.success(list, "OK"));
    }

    private AiReviewReportResponse map(AiReviewReport r) {
        return AiReviewReportResponse.builder()
                .id(r.getId())
                .gameId(r.getGame() != null ? r.getGame().getId() : null)
                .marketplaceItemId(r.getMarketplaceItem() != null ? r.getMarketplaceItem().getId() : null)
                .codeQualityScore(r.getCodeQualityScore())
                .mediaMatchScore(r.getMediaMatchScore())
                .descriptionMatchScore(r.getDescriptionMatchScore())
                .nsfwFlag(r.isNsfwFlag())
                .overallRecommendation(r.getOverallRecommendation() != null
                        ? r.getOverallRecommendation().name() : null)
                .suggestedPrice(r.getSuggestedPrice())
                .suggestedRevenueSplit(r.getSuggestedRevenueSplit())
                .pricingRationale(r.getPricingRationale())
                .flags(parseJson(r.getFlags()))
                .rawOutput(parseJson(r.getRawOutput()))
                .createdAt(r.getCreatedAt())
                .build();
    }

    private JsonNode parseJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }
}
