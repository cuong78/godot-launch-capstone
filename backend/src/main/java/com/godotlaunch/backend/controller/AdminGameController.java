package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.service.GameService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/games")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin Game Management API", description = "Endpoints for administrators to approve or reject game publications")
public class AdminGameController {

    private final GameService gameService;

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
}
