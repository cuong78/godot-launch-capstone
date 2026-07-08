package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.ExternalPublishResponse;
import com.godotlaunch.backend.service.GameService;
import com.godotlaunch.backend.service.StorePublishService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/games")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin Game Management API", description = "Endpoints for administrators to approve or reject game publications")
public class AdminGameController {

    private final GameService gameService;
    private final StorePublishService storePublishService;
    private final com.godotlaunch.backend.repository.UserRepository userRepository;

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve game submission", description = "Approves a pending game submission, changing status to published and sending email notification.")
    public ResponseEntity<ApiResponse<Void>> approveGame(@PathVariable UUID id) {
        gameService.approveGame(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Game approved and published successfully"));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject game submission", description = "Rejects a pending game submission, changing status to rejected and sending email notification with a reason.")
    public ResponseEntity<ApiResponse<Void>> rejectGame(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String reason = request.getOrDefault("reason", "Violated store policies");
        gameService.rejectGame(id, reason);
        return ResponseEntity.ok(ApiResponse.success(null, "Game rejected successfully"));
    }

    @PostMapping("/{id}/store-build")
    @Operation(summary = "Upload build (APK/AAB) và tự động submit lên Google Play",
            description = "Chỉ dùng khi game.status = awaiting_store_build (hợp đồng đã ký). " +
                    "Admin export APK/AAB thủ công từ Godot Editor rồi upload tại đây.")
    public ResponseEntity<ApiResponse<ExternalPublishResponse>> uploadStoreBuild(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("versionNumber") String versionNumber,
            @RequestParam(value = "changelog", required = false) String changelog,
            @RequestParam("shortDescription") String shortDescription,
            @RequestParam("featureGraphic") MultipartFile featureGraphic,
            Authentication authentication) {
        UUID adminId = userRepository.findByEmail(authentication.getName()).orElseThrow().getId();
        ExternalPublishResponse response = storePublishService.uploadBuildAndPublish(
                id, file, versionNumber, changelog, shortDescription, featureGraphic, adminId);
        return ResponseEntity.ok(ApiResponse.success(response, "Build đã được upload và submit lên Google Play"));
    }

    @GetMapping("/{id}/store-publish")
    @Operation(summary = "Xem trạng thái submit Google Play mới nhất của game")
    public ResponseEntity<ApiResponse<ExternalPublishResponse>> getStorePublishStatus(@PathVariable UUID id) {
        ExternalPublishResponse response = storePublishService.getLatestForGame(id);
        return ResponseEntity.ok(ApiResponse.success(response, response == null ? "Chưa có lần submit nào" : "OK"));
    }
}
