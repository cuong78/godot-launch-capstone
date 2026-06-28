package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.ApproveWithdrawalRequest;
import com.godotlaunch.backend.dto.request.RejectWithdrawalRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.WithdrawalDetailResponse;
import com.godotlaunch.backend.dto.response.WithdrawalResponse;
import com.godotlaunch.backend.service.WithdrawalRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/withdrawals")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@Tag(name = "Admin Withdrawal API", description = "Admin withdrawal queue and manual transfer workflow")
public class AdminWithdrawalController {

    private final WithdrawalRequestService withdrawalRequestService;

    @GetMapping
    @Operation(summary = "Get withdrawal queue")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<WithdrawalResponse>>> getAdminWithdrawals() {
        List<WithdrawalResponse> response = withdrawalRequestService.getAdminWithdrawals();
        return ResponseEntity.ok(ApiResponse.success(response, "Withdrawal queue retrieved successfully."));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get withdrawal detail")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalDetailResponse>> getAdminWithdrawalDetail(@PathVariable UUID id) {
        WithdrawalDetailResponse response = withdrawalRequestService.getAdminWithdrawalDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Withdrawal detail retrieved successfully."));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Create a PayOS payout order for a withdrawal request")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalDetailResponse>> approveWithdrawal(
            @PathVariable UUID id,
            @RequestBody(required = false) ApproveWithdrawalRequest request,
            Principal principal) {
        WithdrawalDetailResponse response = withdrawalRequestService.approveWithdrawal(id, request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Withdrawal payout order created successfully."));
    }

    @PostMapping("/{id}/processing")
    @Operation(summary = "Mark withdrawal as processing")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalDetailResponse>> markProcessing(
            @PathVariable UUID id,
            Principal principal) {
        WithdrawalDetailResponse response = withdrawalRequestService.markWithdrawalProcessing(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Withdrawal marked as processing."));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Synchronize PayOS payout status and complete withdrawal only when payout succeeds")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalDetailResponse>> completeWithdrawal(
            @PathVariable UUID id,
            @RequestBody(required = false) ApproveWithdrawalRequest request,
            Principal principal) {
        WithdrawalDetailResponse response = withdrawalRequestService.completeWithdrawal(id, request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Withdrawal payout status synchronized successfully."));
    }

    @PostMapping("/{id}/sync-status")
    @Operation(summary = "Synchronize PayOS payout status")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalDetailResponse>> synchronizeWithdrawalStatus(
            @PathVariable UUID id,
            Principal principal) {
        WithdrawalDetailResponse response = withdrawalRequestService.synchronizeWithdrawalStatus(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Withdrawal payout status synchronized successfully."));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject a withdrawal request")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalDetailResponse>> rejectWithdrawal(
            @PathVariable UUID id,
            @Valid @RequestBody RejectWithdrawalRequest request,
            Principal principal) {
        WithdrawalDetailResponse response = withdrawalRequestService.rejectWithdrawal(id, request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Withdrawal rejected successfully."));
    }
}
