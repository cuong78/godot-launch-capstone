package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateWithdrawalRequest;
import com.godotlaunch.backend.dto.request.ReviewWithdrawalRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.WithdrawalRequestResponse;
import com.godotlaunch.backend.service.WithdrawalRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/withdrawals")
@RequiredArgsConstructor
@Tag(name = "Withdrawal API", description = "Endpoints for managing and reviewing developer withdrawal requests")
public class WithdrawalRequestController {

    private final WithdrawalRequestService withdrawalRequestService;

    @PostMapping
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Submit a withdrawal request", description = "Submits a request to withdraw funds from the user's wallet. Wallet balance will be immediately deducted.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalRequestResponse>> createWithdrawal(
            @Valid @RequestBody CreateWithdrawalRequest request,
            Principal principal) {
        WithdrawalRequestResponse response = withdrawalRequestService.createWithdrawalRequest(request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Withdrawal request submitted successfully."));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")
    @Operation(summary = "Get current user's withdrawal requests", description = "Retrieves a history of withdrawal requests submitted by the logged-in user.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<WithdrawalRequestResponse>>> getMyWithdrawals(Principal principal) {
        List<WithdrawalRequestResponse> response = withdrawalRequestService.getMyWithdrawalRequests(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "My withdrawal requests retrieved successfully."));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get detailed withdrawal request", description = "Retrieves the details of a single withdrawal request by ID. Owner or Admin role required.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalRequestResponse>> getWithdrawalDetail(
            @PathVariable UUID id,
            Principal principal) {
        WithdrawalRequestResponse response = withdrawalRequestService.getWithdrawalRequest(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Withdrawal request retrieved successfully."));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Get all withdrawal requests (Admin)", description = "Retrieves a list of all withdrawal requests in the system. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<WithdrawalRequestResponse>>> getAllWithdrawals() {
        List<WithdrawalRequestResponse> response = withdrawalRequestService.getAllWithdrawalRequests();
        return ResponseEntity.ok(ApiResponse.success(response, "All withdrawal requests retrieved successfully."));
    }

    @PostMapping("/admin/{id}/review")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Review a withdrawal request (Admin)", description = "Approves or rejects a pending withdrawal request. If rejected, funds are refunded to the user's wallet balance. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalRequestResponse>> reviewWithdrawal(
            @PathVariable UUID id,
            @RequestBody ReviewWithdrawalRequest request,
            Principal principal) {
        WithdrawalRequestResponse response = withdrawalRequestService.reviewWithdrawalRequest(id, request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Withdrawal request reviewed successfully."));
    }
}
