package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.service.PayoutBalanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/payout")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@Tag(name = "Admin Payout API", description = "Admin access to PayOS payout account information")
public class AdminPayoutController {

    private final PayoutBalanceService payoutBalanceService;

    @GetMapping("/balance")
    @Operation(summary = "Get PayOS payout account balance")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PayoutGatewayBalanceResponse>> getBalance() {
        PayoutGatewayBalanceResponse response = payoutBalanceService.getCurrentBalance();
        return ResponseEntity.ok(ApiResponse.success(response, "Payout account balance retrieved successfully."));
    }
}
