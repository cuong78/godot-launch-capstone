package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.CreateWithdrawalRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.DeveloperWalletSummaryResponse;
import com.godotlaunch.backend.dto.response.WithdrawalDetailResponse;
import com.godotlaunch.backend.dto.response.WithdrawalResponse;
import com.godotlaunch.backend.service.WithdrawalRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
@Tag(name = "Wallet Withdrawal API", description = "Wallet summary and withdrawal workflow for customers and developers")
public class DeveloperWithdrawalController {

    private final WithdrawalRequestService withdrawalRequestService;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'CUSTOMER', 'ADMIN')")
    @Operation(summary = "Get developer wallet summary")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<DeveloperWalletSummaryResponse>> getWalletSummary(Principal principal) {
        DeveloperWalletSummaryResponse response = withdrawalRequestService.getDeveloperWalletSummary(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Developer wallet summary retrieved successfully."));
    }

    @GetMapping("/withdrawals")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'CUSTOMER', 'ADMIN')")
    @Operation(summary = "Get developer withdrawal history")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<WithdrawalResponse>>> getDeveloperWithdrawals(Principal principal) {
        List<WithdrawalResponse> response = withdrawalRequestService.getDeveloperWithdrawals(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Developer withdrawals retrieved successfully."));
    }

    @PostMapping("/withdrawals")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'CUSTOMER', 'ADMIN')")
    @Operation(summary = "Create a withdrawal request")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalDetailResponse>> createDeveloperWithdrawal(
            @Valid @RequestBody CreateWithdrawalRequest request,
            Principal principal) {
        WithdrawalDetailResponse response = withdrawalRequestService.createDeveloperWithdrawal(request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Withdrawal request submitted successfully."));
    }

    @GetMapping("/withdrawals/{id}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'CUSTOMER', 'ADMIN')")
    @Operation(summary = "Get withdrawal detail for the current developer")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<WithdrawalDetailResponse>> getDeveloperWithdrawalDetail(
            @PathVariable UUID id,
            Principal principal) {
        WithdrawalDetailResponse response = withdrawalRequestService.getDeveloperWithdrawalDetail(id, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Withdrawal detail retrieved successfully."));
    }
}
